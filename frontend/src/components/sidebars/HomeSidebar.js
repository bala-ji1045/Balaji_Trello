import React from "react";
import { Link, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const HomeSidebar = ({ setShowTeamModal = () => {}, projects }) => {
    const { pathname } = useLocation();

    const isActive = (path) => {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    };

    const linkClass = (path) =>
        `btn btn--transparent btn--small${isActive(path) ? " btn--active" : ""}`;

    return (
        <div className="home-menu">
            <ul>
                <li>
                    <Link to="/" className={linkClass("/")}> 
                        <i className="fab fa-trello"></i> Boards
                    </Link>
                </li>
                <li>
                    <Link to="/templates" className={linkClass("/templates")}>
                        <i className="fal fa-ruler-triangle"></i> Templates
                    </Link>
                </li>
                <li>
                    <Link to="/feed" className={linkClass("/feed")}>
                        <i className="fal fa-newspaper"></i> Feed
                    </Link>
                </li>
                <li>
                    <Link to="/inbox" className={linkClass("/inbox")}>
                        <i className="fal fa-inbox"></i> Inbox
                    </Link>
                </li>
                <li>
                    <Link to="/schedule" className={linkClass("/schedule")}>
                        <i className="fal fa-calendar-alt"></i> Schedule
                    </Link>
                </li>
            </ul>

            <div className="home-menu__section">
                <p className="home-menu__title">Projects</p>
                <button
                    type="button"
                    className="btn btn--transparent btn--small"
                    onClick={() => setShowTeamModal(true)}
                    aria-label="Create project"
                >
                    <i className="fal fa-plus"></i>
                </button>
            </div>
            <ul>
                <li>
                    {projects.map((project) => (
                        <Link
                            to={`/p/${project.id}`}
                            className="btn btn--transparent btn--small"
                            key={uuidv4()}
                        >
                            <i className="fal fa-users"></i> {project.title}
                        </Link>
                    ))}
                </li>
            </ul>
        </div>
    );
};

export default HomeSidebar;
