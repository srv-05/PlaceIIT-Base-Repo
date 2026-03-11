import { useNavigate } from "react-router-dom";
import { ManageCoCoPage } from "@/app/components/manage-coco-page";

export function APCCoCosRoute() {
    const navigate = useNavigate();

    const handleCoCoClick = (coco: any) => {
        navigate(`/apc/cocos/${coco.id}/schedule`, { state: { coco } });
    };

    return <ManageCoCoPage onCoCoClick={handleCoCoClick} />;
}
