import "./admin.css";
import { useState } from "react";
import { Navigate } from "react-router";
import { addNewIdol } from "../../services/api";
import type { AddIdolRequest } from "../../interfaces/gameInterfaces";

const Admin = () => {
    const [passwordInput, setPasswordInput] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [idolData, setIdolData] = useState({
        id: 0,
        artist_name: "",
        real_name: "",
        gender: "",
        debut_year: 0,
        nationality: "",
        birth_date: "",
        height: 0,
        position: "",
        image_path: "",
        is_published: 0,
    });

    if (import.meta.env.VITE_ADMIN_ENABLED !== "true") {
    return <Navigate to="/" replace />;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === "debut_year" || name === "height") {
            setIdolData({...idolData, [name]: parseInt(value) || 0});
        }
        else if (name === "birth_date") {
            setIdolData({...idolData, [name]: value});
        }
        else if (name === "is_published") {
            setIdolData({...idolData, [name]: value === "1" ? 1 : 0});
        }
        else {
            setIdolData({...idolData, [name]: value});
        }
    }

    const handleAddIdol = async () => {
        try {
            const dataToSend: AddIdolRequest = {
                ...idolData,
                nationality: idolData.nationality ? idolData.nationality.split(",").map(item => item.trim()) : [],
                position: idolData.position ? idolData.position.split(",").map(item => item.trim()) : [],
            };
            
            console.log("Sending data:", dataToSend);
            const result = await addNewIdol(dataToSend);
            console.log("Idol added successfully:", result);
            alert("Idol added! ✅");
            
            setIdolData({
                id: 0,
                artist_name: "",
                real_name: "",
                gender: "",
                debut_year: 0,
                nationality: "",
                birth_date: "",
                height: 0,
                position: "",
                image_path: "",
                is_published: 0,
            });
        } catch (error) {
            console.error("Error adding idol:", error);
            alert("Error: " + error);
        }
    }
    
    if (!isAuthenticated) {
        return (
            <div className="w-full h-screen flex flex-col justify-center items-center bg-black text-white">
                <h1>Admin Login</h1>
                <input 
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="border-2 border-white bg-[#242424] text-white p-2 mb-2 mt-2"
                />
                <button 
                className="border border-white bg-black text-white rounded-2xl px-4"
                onClick={() => {
                    if (passwordInput === import.meta.env.VITE_ADMIN_PASSWORD) {
                        setIsAuthenticated(true)
                    } else {
                        return <Navigate to="/" replace />;
                    }
                }}
                >
                    Submit
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-screen">
            <div className="w-full h-screen flex flex-col justify-center items-center bg-gray-800 overflow-y-auto">
                <h2 className="text-white text-2xl mb-4">Add New Idol</h2>
                    
                <input name="id" type="number" placeholder="ID" value={idolData.id || ""} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="artist_name" type="text" placeholder="Artist Name *" value={idolData.artist_name} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="real_name" type="text" placeholder="Real Name" value={idolData.real_name} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="gender" type="text" placeholder="Gender" value={idolData.gender} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="debut_year" type="number" placeholder="Debut Year" value={idolData.debut_year || ""} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="nationality" type="text" placeholder="Nationality (comma separated)" value={idolData.nationality} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="birth_date" type="text" placeholder="Birth Date" value={idolData.birth_date || ""} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="height" type="number" placeholder="Height (cm)" value={idolData.height || ""} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="position" type="text" placeholder="Position (comma separated)" value={idolData.position} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="image_path" type="text" placeholder="Image Path" value={idolData.image_path} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />
                <input name="is_published" type="number" placeholder="Is Published (1 - True or 0 - False)" value={idolData.is_published} onChange={handleChange} className="border-2 border-white bg-[#242424] text-white p-2 mb-2 w-80" />

                <button onClick={handleAddIdol} type="button" className="border-2 border-white bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 py-3 mt-4">Add Idol</button>
            </div>
        </div>
    )
}

export default Admin;