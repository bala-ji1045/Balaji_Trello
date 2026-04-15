import React, { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import useAxiosGet from "../hooks/useAxiosGet";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { backendUrl } from "../static/js/const";
import { authAxios, timeSince } from "../static/js/util";
import ProfilePic from "../components/boards/ProfilePic";
import Labels from "../components/boards/Labels";

const appendTargetTitleVerbs = [
    "assigned you to",
    "invited you to",
    "made you admin of",
];

const formatNotification = (notification) => {
    if (appendTargetTitleVerbs.includes(notification.verb))
        return `${notification.verb} ${notification.target?.title || ""}`.trim();
    if (notification.verb === "commented")
        return `${notification.action_object?.body || ""}`;
    return notification.verb;
};

const iconMap = {
    "assigned you to": "fal fa-user-plus",
    "invited you to": "fal fa-paper-plane",
    "made you admin of": "fal fa-arrow-up",
    commented: "fal fa-comment",
};

const Inbox = ({ embedded = false, onOpenTarget } = {}) => {
    const desiredTitle = embedded ? document.title : "Inbox | Trello";
    useDocumentTitle(desiredTitle, true);
    const history = useHistory();

    const [refreshKey, setRefreshKey] = useState(0);
    const {
        data: notifications,
        setData: setNotifications,
        loading,
    } = useAxiosGet(`/notifications/?r=${refreshKey}`);

    const [showAll, setShowAll] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const totalCount = (notifications || []).length;
    const unreadCount = (notifications || []).filter((n) => n.unread === true)
        .length;

    const notificationsToShow = useMemo(() => {
        const list = notifications || [];
        if (showAll) return list;
        return list.filter((n) => n.unread === true);
    }, [notifications, showAll]);

    const grouped = useMemo(() => {
        const now = new Date();
        const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const todayStart = startOfDay(now);

        const today = [];
        const yesterday = [];
        const week = [];
        const earlier = [];

        notificationsToShow.forEach((n) => {
            const d = new Date(n.created_at);
            if (Number.isNaN(d.getTime())) {
                today.push(n);
                return;
            }

            const diffDays = Math.floor(
                (todayStart.getTime() - startOfDay(d).getTime()) / 86400000
            );

            if (diffDays <= 0) today.push(n);
            else if (diffDays === 1) yesterday.push(n);
            else if (diffDays <= 7) week.push(n);
            else earlier.push(n);
        });

        return [
            { key: "today", title: "Today", items: today },
            { key: "yesterday", title: "Yesterday", items: yesterday },
            { key: "week", title: "This week", items: week },
            { key: "earlier", title: "Earlier", items: earlier },
        ].filter((g) => g.items.length !== 0);
    }, [notificationsToShow]);

    const markAllRead = async () => {
        await authAxios.post(`${backendUrl}/notifications/`);
        setNotifications((prev) =>
            (prev || []).map((n) => ({
                ...n,
                unread: false,
            }))
        );
    };

    const setReadState = async (notification, unread) => {
        if (!notification?.id) return;
        setUpdatingId(notification.id);
        try {
            await authAxios.patch(`${backendUrl}/notifications/${notification.id}/`, {
                unread,
            });
            setNotifications((prev) =>
                (prev || []).map((n) =>
                    n.id === notification.id ? { ...n, unread } : n
                )
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const acceptInvite = async (notification) => {
        const token = notification?.action_object?.token;
        if (!token) return;
        setUpdatingId(notification.id);
        try {
            await authAxios.post(`${backendUrl}/projects/join/${token}/`);
            setNotifications((prev) =>
                (prev || []).filter((n) => n.id !== notification.id)
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const openTarget = (notification) => {
        if (notification?.unread) setReadState(notification, false);

        if (typeof onOpenTarget === "function") {
            onOpenTarget(notification);
            return;
        }

        if (
            notification?.target_model === "Item" &&
            notification?.target?.board_id &&
            notification?.target?.id
        ) {
            history.push(
                `/workspace?tab=board&board=${notification.target.board_id}&card=${notification.target.id}`
            );
            return;
        }
        if (notification?.target_model === "Project" && notification?.target?.id) {
            history.push(`/p/${notification.target.id}`);
        }
    };

    const actions = (
        <div className={`inbox__actions${embedded ? " inbox__actions--embedded" : ""}`}>
            <div className="inbox__tabs" role="tablist" aria-label="Inbox filters">
                <button
                    type="button"
                    className={`btn btn--secondary btn--small${
                        !showAll ? " btn--active" : ""
                    }`}
                    onClick={() => setShowAll(false)}
                    role="tab"
                    aria-selected={!showAll}
                >
                    Unread <span className="inbox__count">{unreadCount}</span>
                </button>
                <button
                    type="button"
                    className={`btn btn--secondary btn--small${
                        showAll ? " btn--active" : ""
                    }`}
                    onClick={() => setShowAll(true)}
                    role="tab"
                    aria-selected={showAll}
                >
                    All <span className="inbox__count">{totalCount}</span>
                </button>
            </div>

            <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={markAllRead}
                disabled={unreadCount === 0}
            >
                Mark all read
            </button>
            <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setRefreshKey((k) => k + 1)}
            >
                Refresh
            </button>
        </div>
    );

    const content = (
        <>
            {!embedded ? (
                <div className="home__section">
                    <p className="home__title">
                        <i className="fal fa-inbox"></i> Inbox
                    </p>
                    {actions}
                </div>
            ) : (
                <div className="workspace-embed__section">{actions}</div>
            )}

            {loading && <div className="home__empty">Loading inbox…</div>}

            {!loading && notificationsToShow.length === 0 && (
                <div className="home__empty">No notifications.</div>
            )}

            {!loading && grouped.length > 0 && (
                <div className="activity">
                    {grouped.map((group) => (
                        <div key={group.key} className="activity__group">
                            <div className="activity__group-title">
                                {group.title}
                            </div>
                            <div className="inbox__list">
                                {group.items.map((notification) => {
                                    const icon =
                                        iconMap[notification.verb] ||
                                        "fal fa-bell";
                                    const canOpen =
                                        (notification?.target_model === "Item" &&
                                            notification?.target?.board_id) ||
                                        (notification?.target_model === "Project" &&
                                            notification?.target?.id);
                                    const isUpdating = updatingId === notification.id;

                                    const isItem =
                                        notification.target_model === "Item" &&
                                        Boolean(notification.target);

                                    const onOpen = () => {
                                        if (!canOpen) return;
                                        openTarget(notification);
                                    };

                                    const onKeyDown = (e) => {
                                        if (!canOpen) return;
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onOpen();
                                        }
                                    };

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`inbox-item${
                                                notification.unread
                                                    ? " inbox-item--unread"
                                                    : ""
                                            }${canOpen ? " inbox-item--clickable" : ""}`}
                                            role={canOpen ? "button" : undefined}
                                            tabIndex={canOpen ? 0 : undefined}
                                            onClick={(e) => {
                                                if (!canOpen) return;
                                                const target = e.target;
                                                if (
                                                    target &&
                                                    target.closest &&
                                                    target.closest("button")
                                                )
                                                    return;
                                                onOpen();
                                            }}
                                            onKeyDown={onKeyDown}
                                        >
                                                {isItem && (
                                                    <div className="inbox-item__card">
                                                        <Labels
                                                            labels={
                                                                notification.target.labels ||
                                                                []
                                                            }
                                                        />
                                                        <p className="inbox-item__card-title">
                                                            {notification.target.title}
                                                        </p>
                                                        {(notification.target.board_title ||
                                                            notification.target.list_title) && (
                                                            <div className="inbox-item__pills">
                                                                {notification.target.board_title && (
                                                                    <span className="inbox-item__pill">
                                                                        {notification.target.board_title}
                                                                    </span>
                                                                )}
                                                                {notification.target.list_title && (
                                                                    <span className="inbox-item__pill inbox-item__pill--muted">
                                                                        {notification.target.list_title}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="inbox-item__header">
                                                    <ProfilePic
                                                        user={notification.actor}
                                                        large={true}
                                                    />
                                                    <div className="inbox-item__header-text">
                                                        <p className="inbox-item__name">
                                                            {notification.actor
                                                                ?.full_name}
                                                        </p>
                                                        <p className="inbox-item__time">
                                                            {timeSince(
                                                                notification.created_at
                                                            )}
                                                        </p>
                                                    </div>
                                                    {notification.unread && (
                                                        <span
                                                            className="inbox-item__dot"
                                                            aria-label="Unread"
                                                        ></span>
                                                    )}
                                                </div>

                                                <p className="inbox-item__text">
                                                    <i className={icon}></i>
                                                    {formatNotification(notification)}
                                                </p>

                                                <div className="inbox-item__actions">
                                                    {notification.verb ===
                                                        "invited you to" &&
                                                        notification.action_object
                                                            ?.token && (
                                                            <button
                                                                type="button"
                                                                className="btn btn--small"
                                                                onClick={() =>
                                                                    acceptInvite(
                                                                        notification
                                                                    )
                                                                }
                                                                disabled={isUpdating}
                                                            >
                                                                Accept
                                                            </button>
                                                        )}

                                                    {canOpen && (
                                                        <button
                                                            type="button"
                                                            className="btn btn--small btn--secondary"
                                                            onClick={() =>
                                                                openTarget(
                                                                    notification
                                                                )
                                                            }
                                                        >
                                                            Open
                                                        </button>
                                                    )}

                                                    {notification.unread ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn--small btn--secondary"
                                                            onClick={() =>
                                                                setReadState(
                                                                    notification,
                                                                    false
                                                                )
                                                            }
                                                            disabled={isUpdating}
                                                        >
                                                            Mark read
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn btn--small btn--secondary"
                                                            onClick={() =>
                                                                setReadState(
                                                                    notification,
                                                                    true
                                                                )
                                                            }
                                                            disabled={isUpdating}
                                                        >
                                                            Mark unread
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
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

export default Inbox;
