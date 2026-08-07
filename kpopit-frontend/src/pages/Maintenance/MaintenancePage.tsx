import MaintenanceDatabase from "./MaintenanceDatabase";
import MaintenanceCollection from "./MaintenanceCollection";

type MaintenanceType = "database" | "collection" | "other";

interface MaintenancePageProps {
    type?: MaintenanceType;
}

const MaintenancePage = (props: MaintenancePageProps) => {
    const { type } = props;

    const renderPageContent = () => {
        switch(type) {
            case "database": return <MaintenanceDatabase />;

            case "collection": return <MaintenanceCollection />;

            case "other": return null;

            default: return null;
        }
    }

    const bgClass = type === "collection" ? "bg-[#0a0a0a]" : "bg-[#242424]";

    return (
        <div className={`min-h-screen w-full flex flex-col justify-start items-center ${bgClass} text-center px-4`}>
            {renderPageContent()}
        </div>
    )
}

export default MaintenancePage;