import { useNavigate } from "react-router-dom";
import { CoCoHomePage } from "@/app/components/coco/coco-home-page";

export function CoCoHomeRoute() {
    const navigate = useNavigate();

    return (
        <CoCoHomePage
            companyName="Google"
            onRoundTracking={() => navigate("/coco/round-tracking")}
        />
    );
}
