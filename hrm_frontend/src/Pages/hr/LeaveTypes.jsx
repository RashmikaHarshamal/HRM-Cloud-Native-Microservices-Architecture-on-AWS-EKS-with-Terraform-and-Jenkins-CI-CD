import React from "react";
import { Tag } from "lucide-react";
import { NameListPage } from "../../components/NameListPage";
import { hrApi } from "../../services/api";

const LeaveTypes = () => (
  <NameListPage
    title="Add Leave Types"
    subtitle="Define the kinds of leave your company offers"
    heading="Leave Types"
    hint="Add as many as you need, e.g. Sick Leave, Annual Leave"
    placeholder="Leave type, e.g. Sick Leave"
    addLabel="Add another leave"
    saveLabel="Save Leave Types"
    existingLabel="Existing leave types"
    emptyLabel="No leave types added yet"
    icon={Tag}
    load={hrApi.getLeaveTypes}
    save={hrApi.createLeaveTypes}
  />
);

export default LeaveTypes;
