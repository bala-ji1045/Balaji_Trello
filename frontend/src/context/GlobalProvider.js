import React, { useReducer } from "react";
import { useHistory } from "react-router-dom";

import { backendUrl } from "../static/js/const";
import { authAxios } from "../static/js/util";
import globalContext from "./globalContext";
import {
    globalReducer,
    LOGIN,
    LOGOUT,
    SET_BOARD_CONTEXT,
} from "./globalReducer";

const GlobalProvider = (props) => {
    const history = useHistory();
    const [globalState, dispatch] = useReducer(globalReducer, {
        authUser: null,
        checkedAuth: false,
        board: null,
        setBoard: null,
    });

    const clearAuthStorage = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        delete authAxios.defaults.headers.common["Authorization"];
    };

    const login = async (resData) => {
        localStorage.setItem("accessToken", resData.access);
        localStorage.setItem("refreshToken", resData.refresh);
        const url = backendUrl + "/me/";

        // No try catch block so error bubbles up to LoginForm.js to be handled there
        const { data: user } = await authAxios.get(url);
        dispatch({ type: LOGIN, user });

        // If the user arrived via an invite link while logged out,
        // complete the join after login.
        const pendingInviteToken = sessionStorage.getItem(
            "pendingProjectInviteToken"
        );
        if (pendingInviteToken) {
            try {
                await authAxios.post(
                    `${backendUrl}/projects/join/${pendingInviteToken}/`
                );
            } catch (err) {
                // Ignore here; user can still proceed normally.
            } finally {
                sessionStorage.removeItem("pendingProjectInviteToken");
            }
        }

        history.push("/");
    };

    const checkAuth = async () => {
        const url = backendUrl + "/me/";
        try {
            const { data: user } = await authAxios.get(url);
            dispatch({ type: LOGIN, user });
        } catch (err) {
            clearAuthStorage();
            dispatch({ type: LOGOUT });
        }
    };

    const logout = () => {
        clearAuthStorage();
        dispatch({ type: LOGOUT });
        history.push("/login");
    };

    const setBoardContext = (board, setBoard) => {
        dispatch({ type: SET_BOARD_CONTEXT, board, setBoard });
    };

    return (
        <globalContext.Provider
            value={{
                authUser: globalState.authUser,
                checkedAuth: globalState.checkedAuth,
                board: globalState.board,
                setBoard: globalState.setBoard,
                checkAuth,
                login,
                logout,
                setBoardContext,
            }}
        >
            {props.children}
        </globalContext.Provider>
    );
};

export default GlobalProvider;
