import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { useFirestore } from "../../hooks/useFirestore";
import { useTranslation } from "../../context/AppContext";
import { toast, Toaster } from "react-hot-toast";
import { UserPlus, Eye, Edit2, Trash2 } from "lucide-react";

const emptyForm = {
  name: "",
  nameAr: "",
  jobTitle: "",
  monthlySalary: "",
  overtimeRate: "1.5",
  phone: "",
  email: "",
  startDate: new Date().toISOString().split('T')[0],
  isActive: true,
  zkUserId: "",
};

const EmployeesList = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { data: employees, loading, addDocument, deleteDocument, updateDocument } = useFirestore("employees");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name:          employee.name || "",
      nameAr:        employee.nameAr || "",
      jobTitle:      employee.jobTitle || "",
      monthlySalary: String(employee.monthlySalary ?? employee.hourlyRate ?? ""),
      overtimeRate:  String(employee.overtimeRate ?? "1.5"),
      phone:         employee.phone || "",
      email:         employee.email || "",
      startDate:     employee.startDate || new Date().toISOString().split('T')[0],
      isActive:      employee.isActive ?? true,
      zkUserId:      employee.zkUserId || "",
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const payload = {
        ...formData,
        monthlySalary: Number(formData.monthlySalary),
        overtimeRate:  Number(formData.overtimeRate),
        zkUserId:      formData.zkUserId ? String(formData.zkUserId).trim() : "",
        // keep hourlyRate as 0 for backward compat with old records
        hourlyRate: 0,
        pettyCashLimit: 0,
      };

      if (editingEmployee) {
        await updateDocument(editingEmployee.id, payload);
        toast.success(t("successfullyUpdated"), { position: "top-center" });
      } else {
        await addDocument(payload);
        toast.success(t("successfullyAdded"), { position: "top-center" });
      }
      handleClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      toast.success(t("successfullyDeleted"));
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      header: t("employeeName"),
      key: language === "ar" ? "nameAr" : "name",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-primary">{language === "ar" ? row.nameAr : row.name}</span>
          <span className="text-xs text-text-muted">{language === "ar" ? row.name : row.nameAr}</span>
        </div>
      )
    },
    { header: t("jobTitle"), key: "jobTitle" },
    {
      header: "الراتب الشهري",
      key: "monthlySalary",
      render: (val, row) => (
        <span className="font-mono font-bold text-success">
          {(val || row.hourlyRate || 0).toLocaleString()} ج.م
        </span>
      )
    },
    {
      header: t("status"),
      key: "isActive",
      render: (val) => (
        <Badge variant={val ? 'green' : 'red'}>
          {val ? t("active") : t("inactive")}
        </Badge>
      )
    },
    {
      header: t("actions"),
      key: "actions",
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" title="عرض الملف" onClick={() => navigate(`/employees/${row.id}`)}>
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost" size="sm" title="تعديل"
            className="text-primary-light hover:text-primary"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost" size="sm" title="حذف"
            className="text-danger"
            onClick={() => setDeleteConfirm(row.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <PageWrapper title={t("employees")}>
      <Toaster position="top-center" />

      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t("employees")}</h1>
          <p className="text-text-muted mt-1">إدارة الكادر الوظيفي والبيانات الأساسية</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <UserPlus size={20} />
          {t("addEmployee")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        searchPlaceholder={t("employeeName")}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={
          editingEmployee
            ? `تعديل بيانات: ${language === "ar" ? editingEmployee.nameAr : editingEmployee.name}`
            : t("addEmployee")
        }
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>{t("cancel")}</Button>
            <Button onClick={handleSubmit}>
              {editingEmployee ? t("save") : t("add")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="الاسم (بالعربية)" name="nameAr" value={formData.nameAr} onChange={handleInputChange} required />
          <Input label="Name (English)"   name="name"   value={formData.name}   onChange={handleInputChange} required />
          <Input label={t("jobTitle")}    name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} required />
          <Input label={t("phone")}       name="phone"  value={formData.phone}  onChange={handleInputChange} />
          <Input label="البريد الإلكتروني" name="email" type="email" value={formData.email} onChange={handleInputChange} />
          <Input
            label="الراتب الشهري (ج.م)"
            name="monthlySalary"
            type="number"
            value={formData.monthlySalary}
            onChange={handleInputChange}
            required
          />
          <Input label={t("startDate")} name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} required />

          <div className="md:col-span-2">
            <Input
              label="رقم الموظف على جهاز البصمة (LX50)"
              name="zkUserId"
              type="number"
              value={formData.zkUserId}
              onChange={handleInputChange}
              placeholder="مثال: 1 أو 2 أو 3 ..."
            />
            <p style={{ fontSize: "11px", color: "#9090A8", marginTop: "4px" }}>
              الرقم المسجَّل على جهاز ZKTeco — يُستخدم لربط بصمة الموظف تلقائيًا بسجل الحضور
            </p>
          </div>

          {editingEmployee && (
            <div className="md:col-span-2 flex items-center gap-3 p-4 bg-bg rounded-xl border border-border">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm font-semibold cursor-pointer select-none">
                {formData.isActive ? "الموظف نشط ✅" : "الموظف غير نشط ❌"}
              </label>
            </div>
          )}
        </form>
      </Modal>
      <ConfirmModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDelete(deleteConfirm)}
        message={t("confirmDelete")}
      />
    </PageWrapper>
  );
};

export default EmployeesList;
