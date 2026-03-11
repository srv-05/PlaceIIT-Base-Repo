import { useNavigate } from "react-router-dom";
import { CoCoMyCompaniesPage } from "@/app/components/coco/coco-my-companies-page";

export function CoCoCompaniesRoute() {
    const navigate = useNavigate();

    const handleCompanySelect = (companyName: string) => {
        navigate("/coco", { state: { selectedCompany: companyName } });
    };

    return <CoCoMyCompaniesPage onCompanySelect={handleCompanySelect} />;
}
