import React, { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import HomeSidebar from "../components/sidebars/HomeSidebar";
import HomeBoard from "../components/boards/HomeBoard";
import Labels from "../components/boards/Labels";
import ProfilePic from "../components/boards/ProfilePic";
import useAxiosGet from "../hooks/useAxiosGet";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { backendUrl } from "../static/js/const";
import { authAxios, timeSince } from "../static/js/util";

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

const Feed = () => {
    useDocumentTitle("Feed | Trello");
    const history = useHistory();

    const { data: projects } = useAxiosGet("/projects/");
    const {
        data: recentlyViewedBoards,
        replaceItem: replaceRecentBoard,
    } = useAxiosGet("/boards/?sort=recent");
    const {
        data: notifications,
        setData: setNotifications,
        loading: notificationsLoading,
    } = useAxiosGet("/notifications/");

    const [showAll, setShowAll] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const notificationsToShow = useMemo(() => {
        const list = notifications || [];
        if (showAll) return list;
        return list.filter((n) => n.unread === true);
    }, [notifications, showAll]);

    const grouped = useMemo(() => {
        const todayKey = new Date().toISOString().slice(0, 10);
        const today = [];
        const earlier = [];

        notificationsToShow.forEach((n) => {
            const d = new Date(n.created_at);
            const key = Number.isNaN(d.getTime())
                ? todayKey
                : d.toISOString().slice(0, 10);
            if (key === todayKey) today.push(n);
            else earlier.push(n);
        });

        return [
            { key: "today", title: "Today", items: today },
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

    const openTarget = (notification) => {
        if (notification?.unread) setReadState(notification, false);

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

    const hasUnread = useMemo(
        () => (notifications || []).some((n) => n.unread === true),
        [notifications]
    );

    return (
        <div className="home-wrapper">
            <HomeSidebar projects={projects || []} setShowTeamModal={() => {}} />
            <div className="home">
                {(recentlyViewedBoards || []).length !== 0 && (
                    <>
                        <div className="home__section">
                            <p className="home__title">
                                <i className="fal fa-clock"></i> Recently Viewed
                            </p>
                        </div>
                        <div className="home__boards">
                            {recentlyViewedBoards.map((board) => (
                                <HomeBoard
                                    board={board}
                                    replaceBoard={replaceRecentBoard}
                                    key={board.id}
                                />
                            ))}
                        </div>
                    </>
                )}

                <div className="home__section">
                    <p className="home__title">
                        <i className="fal fa-newspaper"></i> Feed
                    </p>
                    <div className="inbox__actions">
                        <button
                            type="button"
                            className="btn btn--secondary btn--small"
                            onClick={() => setShowAll((s) => !s)}
                        >
                            {showAll ? "Unread only" : "View all"}
                        </button>
                        {hasUnread && (
                            <button
                                type="button"
                                className="btn btn--secondary btn--small"
                                onClick={markAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                </div>

                {notificationsLoading && (
                    <div className="home__empty">Loading feed…</div>
                )}

                {!notificationsLoading && notificationsToShow.length === 0 && (
                    <div className="home__empty">No activity yet.</div>
                )}

                {!notificationsLoading && grouped.length > 0 && (
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
                                        const isUpdating =
                                            updatingId === notification.id;

                                        return (
                                            <div
                                                key={notification.id}
                                                className={`inbox-item${
                                                    notification.unread
                                                        ? " inbox-item--unread"
                                                        : ""
                                                }`}
                                            >
                                                {notification.target_model === "Item" &&
                                                    notification.target && (
                                                        <div className="inbox-item__card">
                                                            <Labels
                                                                labels={
                                                                    notification.target
                                                                        .labels || []
                                                                }
                                                            />
                                                            <p className="inbox-item__card-title">
                                                                {notification.target.title}
                                                            </p>
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
                                                </div>

                                                <p className="inbox-item__text">
                                                    <i className={icon}></i>
                                                    {formatNotification(notification)}
                                                </p>

                                                <div className="inbox-item__actions">
                                                    {canOpen && (
                                                        <button
                                                            type="button"
                                                            className="btn btn--small btn--secondary"
                                                            onClick={() =>
                                                                openTarget(notification)
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
            </div>
        </div>
    );
};

export default Feed;
