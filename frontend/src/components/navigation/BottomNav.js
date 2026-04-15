import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

const getLastBoardId = () => {
    try {
        const id = window.localStorage.getItem("lastBoardId");
        if (id && String(id).trim() !== "") return String(id);
    } catch (e) {
        // ignore
    }
    return null;
};

const buildWorkspacePath = (tab) => {
    const params = new URLSearchParams();
    params.set("tab", tab);

    const boardId = getLastBoardId();
    if (boardId) params.set("board", boardId);

    return `/workspace?${params.toString()}`;
};

const BottomNav = () => {
    const { pathname, search } = useLocation();

    const workspaceTab = useMemo(() => {
        if (!pathname.startsWith("/workspace")) return null;
        return new URLSearchParams(search).get("tab") || "board";
    }, [pathname, search]);

    const isActive = (key) => {
        if (pathname.startsWith("/workspace")) {
            if (key === "inbox") return workspaceTab === "inbox";
            if (key === "planner") return workspaceTab === "planner";
            if (key === "board") return workspaceTab === "board";
            if (key === "switch") return false;
        }

        if (key === "inbox") return pathname.startsWith("/inbox");
        if (key === "planner") return pathname.startsWith("/schedule");
        if (key === "board") return pathname.startsWith("/b/");
        if (key === "switch") return pathname === "/";
        return false;
    };

    const itemClass = (key) =>
        `bottom-nav__item${isActive(key) ? " bottom-nav__item--active" : ""}`;

    return (
        <nav className="bottom-nav" aria-label="Quick navigation">
            <Link to={buildWorkspacePath("inbox")} className={itemClass("inbox")}>
                <i className="fal fa-inbox" aria-hidden="true"></i>
                <span>Inbox</span>
            </Link>
            <Link
                to={buildWorkspacePath("planner")}
                className={itemClass("planner")}
            >
                <i className="fal fa-calendar-alt" aria-hidden="true"></i>
                <span>Planner</span>
            </Link>
            <Link to={buildWorkspacePath("board")} className={itemClass("board")}>
                <i className="fab fa-trello" aria-hidden="true"></i>
                <span>Board</span>
            </Link>
            <Link to="/" className={itemClass("switch")}>
                <i className="fal fa-th-large" aria-hidden="true"></i>
                <span>Switch boards</span>
            </Link>
        </nav>
    );
};

export default BottomNav;
