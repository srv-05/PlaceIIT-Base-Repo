import { useNavigate, useLocation } from "react-router-dom";
import { CoCoHomePage } from "@/app/components/coco/coco-home-page";

export function CoCoHomeRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const companyName = location.state?.selectedCompany || "Google";

    return (
        <CoCoHomePage
            companyName={companyName}
            onRoundTracking={() => navigate("/coco/round-tracking", { state: { selectedCompany: companyName } })}
        />
    );
}
