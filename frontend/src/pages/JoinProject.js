import React, { useContext, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import globalContext from "../context/globalContext";
import { backendUrl } from "../static/js/const";
import { authAxios } from "../static/js/util";

const JoinProject = () => {
    const { token } = useParams();
    const history = useHistory();
    const { authUser } = useContext(globalContext);
    const [error, setError] = useState(null);

    useEffect(() => {
        const run = async () => {
            if (!token) {
                history.push("/");
                return;
            }

            // If not logged in, remember the token and redirect to login.
            if (!authUser) {
                sessionStorage.setItem("pendingProjectInviteToken", token);
                history.push("/login");
                return;
            }

            try {
                await authAxios.post(`${backendUrl}/projects/join/${token}/`);
                history.push("/");
            } catch (err) {
                const message =
                    err?.response?.data?.error ||
                    err?.response?.data?.detail ||
                    err?.message ||
                    "Unable to join project";
                setError(message);
            }
        };

        run();
    }, [authUser, history, token]);

    if (error) {
        return (
            <div className="container">
                <h2>Join Project</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="container">
            <h2>Join Project</h2>
            <p>Joining…</p>
        </div>
    );
};

export default JoinProject;
