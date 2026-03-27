import MaintenanceDatabase from "./MaintenanceDatabase";

type MaintenanceType = "database" | "other";

interface MaintenancePageProps {
    type?: MaintenanceType;
}

const MaintenancePage = (props: MaintenancePageProps) => {
    const { type } = props;

    const renderPageContent = () => {
        switch(type) {
            case "database": return <MaintenanceDatabase />;

            case "other": return null;

            default: return null;
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col justify-start items-center bg-[#242424] text-center px-2">
            {renderPageContent()}
        </div>
    )
}

export default MaintenancePage;