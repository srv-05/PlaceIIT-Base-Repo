import { useNavigate } from "react-router-dom";
import { ManageCompaniesPage } from "@/app/components/manage-companies-page";

export function APCCompaniesRoute() {
    const navigate = useNavigate();

    const handleCompanyClick = (company: any) => {
        navigate(`/apc/companies/${company.id}`, { state: { company } });
    };

    return <ManageCompaniesPage onCompanyClick={handleCompanyClick} />;
}
