import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { CoCoSchedulePage } from "@/app/components/coco-schedule-page";

export function APCCoCoScheduleRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const coco = location.state?.coco;

    if (!coco) {
        return <Navigate to="/apc/cocos" replace />;
    }

    return (
        <CoCoSchedulePage
            coco={coco}
            onBack={() => navigate("/apc/cocos")}
        />
    );
}
