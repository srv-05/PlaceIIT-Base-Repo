import { useNavigate, useLocation } from "react-router-dom";
import { RoundTrackingPage } from "@/app/components/coco/round-tracking-page";

export function CoCoRoundTrackingRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const companyName = location.state?.selectedCompany || "Google";

    return (
        <RoundTrackingPage
            companyName={companyName}
            onBack={() => navigate("/coco")}
        />
    );
}
