import React from "react";
import { BadgeCheck } from "lucide-react";
import { NameListPage } from "../../components/NameListPage";
import { hrApi } from "../../services/api";

const EmploymentTypes = () => (
  <NameListPage
    title="Add Employment Types"
    subtitle="Define the employment arrangements used in your company"
    heading="Employment Types"
    hint="Add as many as you need, e.g. Full-Time, Part-Time, Internship"
    placeholder="Employment type, e.g. Full-Time"
    addLabel="Add another employment type"
    saveLabel="Save Employment Types"
    existingLabel="Existing employment types"
    emptyLabel="No employment types added yet"
    icon={BadgeCheck}
    load={hrApi.getEmploymentTypes}
    save={hrApi.createEmploymentTypes}
    onUpdate={hrApi.updateEmploymentType}
    onDelete={hrApi.deleteEmploymentType}
    backPath="/hr/employees"
    backLabel="Back to Employees"
    activePage="Employees"
  />
);

export default EmploymentTypes;
