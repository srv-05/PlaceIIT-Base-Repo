import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { CompanyDetailsPage } from "@/app/components/company-details-page";

export function APCCompanyDetailsRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const company = location.state?.company;

    if (!company) {
        return <Navigate to="/apc/companies" replace />;
    }

    return (
        <CompanyDetailsPage
            companyId={company.id}
            companyName={company.name}
            cocoAssigned={company.cocoAssigned}
            venue={company.venue}
            day={company.day}
            slot={company.slot}
            shortlistedCount={company.shortlistedCount}
            onBack={() => navigate("/apc/companies")}
        />
    );
}
