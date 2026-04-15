import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import useAxiosGet from "../hooks/useAxiosGet";
import useDocumentTitle from "../hooks/useDocumentTitle";

const formatDateKey = (isoString) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "No date";
    return d.toISOString().slice(0, 10);
};

const formatHumanDate = (dateKey) => {
    const d = new Date(dateKey + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) return dateKey;

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);

    if (dateKey === todayKey) return "Today";
    if (dateKey === tomorrowKey) return "Tomorrow";

    return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
};

const formatTime = (isoString) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const Schedule = ({ embedded = false, onOpenItem } = {}) => {
    const desiredTitle = embedded ? document.title : "Planner | Trello";
    useDocumentTitle(desiredTitle, true);

    const [assignedToMe, setAssignedToMe] = useState(true);

    const query = assignedToMe
        ? "/boards/items/due/?assigned=me&days=30"
        : "/boards/items/due/?days=30";

    const { data: dueItems, loading } = useAxiosGet(query);

    const grouped = useMemo(() => {
        const items = dueItems || [];
        const map = new Map();
        items.forEach((item) => {
            const key = formatDateKey(item.due_date);
            const list = map.get(key) || [];
            list.push(item);
            map.set(key, list);
        });

        const keys = Array.from(map.keys()).sort();
        return keys.map((key) => ({ key, title: formatHumanDate(key), items: map.get(key) }));
    }, [dueItems]);

    const actions = (
        <div className={`schedule__actions${embedded ? " schedule__actions--embedded" : ""}`}>
            <button
                type="button"
                className={`btn btn--transparent btn--small${
                    assignedToMe ? " btn--active" : ""
                }`}
                onClick={() => setAssignedToMe(true)}
            >
                Assigned to me
            </button>
            <button
                type="button"
                className={`btn btn--transparent btn--small${
                    !assignedToMe ? " btn--active" : ""
                }`}
                onClick={() => setAssignedToMe(false)}
            >
                All cards
            </button>
        </div>
    );

    const content = (
        <>
            {!embedded ? (
                <div className="home__section">
                    <p className="home__title">
                        <i className="fal fa-calendar-alt"></i> Planner
                    </p>
                    {actions}
                </div>
            ) : (
                <div className="workspace-embed__section">{actions}</div>
            )}

            {loading && <div className="home__empty">Loading schedule…</div>}

            {!loading && grouped.length === 0 && (
                <div className="home__empty">No due dates in the next 30 days.</div>
            )}

            {!loading && grouped.length > 0 && (
                <div className="schedule">
                    {grouped.map((group) => (
                        <div key={group.key} className="schedule__group">
                            <div className="schedule__group-title">{group.title}</div>
                            <div className="schedule__items">
                                {group.items.map((item) => {
                                    const canEmbedOpen =
                                        embedded && typeof onOpenItem === "function";
                                    const open = () => {
                                        if (!canEmbedOpen) return;
                                        onOpenItem(item);
                                    };

                                    return canEmbedOpen ? (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="schedule-item schedule-item--button"
                                            onClick={open}
                                        >
                                            <div className="schedule-item__main">
                                                <div className="schedule-item__title">{item.title}</div>
                                                <div className="schedule-item__meta">
                                                    <span className="schedule-item__pill">
                                                        {item.board_title}
                                                    </span>
                                                    <span className="schedule-item__pill schedule-item__pill--muted">
                                                        {item.list_title}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="schedule-item__time">
                                                {formatTime(item.due_date)}
                                            </div>
                                        </button>
                                    ) : (
                                        <Link
                                            key={item.id}
                                            className="schedule-item"
                                            to={`/workspace?tab=board&board=${item.board_id}&card=${item.id}`}
                                        >
                                            <div className="schedule-item__main">
                                                <div className="schedule-item__title">{item.title}</div>
                                                <div className="schedule-item__meta">
                                                    <span className="schedule-item__pill">
                                                        {item.board_title}
                                                    </span>
                                                    <span className="schedule-item__pill schedule-item__pill--muted">
                                                        {item.list_title}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="schedule-item__time">
                                                {formatTime(item.due_date)}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    if (embedded) return content;

    return (
        <div className="home-wrapper home-wrapper--solo">
            <div className="home">{content}</div>
        </div>
    );
};

export default Schedule;
