import { Link } from "react-router-dom";

function HomeTest() {

    return (
        <div>
            <Link to="hometest">
                <span
                className="h-60 w-60"
                >
                    Classic
                </span>
            </Link>
        </div>
    )
}

export default HomeTest;