import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { backendUrl } from "../../static/js/const";
import { authAxios, timeSince } from "../../static/js/util";
import nonotif from "../../static/img/nonotif.svg";
import ProfilePic from "../boards/ProfilePic";
import Labels from "../boards/Labels";

const getNotificationsPosition = () => {
    const bellElem = document.querySelector(".header__li--notifications");
    return {
        top:
            bellElem.getBoundingClientRect().y +
            bellElem.getBoundingClientRect().height +
            10 +
            "px",
        right: "10px",
        left: "unset",
    };
};

const NotificationsModal = ({
    setShowModal,
    notifications,
    setNotifications,
}) => {
    const [showAll, setShowAll] = useState(false); // See all or just unread?
    const history = useHistory();

    const notificationsToShow = showAll
        ? notifications || []
        : (notifications || []).filter(
              (notification) => notification.unread === true
          );

    const markAllRead = async () => {
        await authAxios.post(`${backendUrl}/notifications/`);
        const newNotifications = notifications.map((notification) => ({
            ...notification,
            unread: false,
        }));

        setNotifications(newNotifications);
    };

    return (
        <div
            className="label-modal label-modal--shadow label-modal--large"
            style={getNotificationsPosition()}
        >
            <div className="label-modal__header">
                <p>Notifications</p>
                <button onClick={() => setShowModal(false)}>
                    <i className="fal fa-times"></i>
                </button>
            </div>
            <div className="label-modal__content">
                <div className="label-modal__filter">
                    <button onClick={() => setShowAll((showAll) => !showAll)}>
                        {!showAll ? "View All" : "Filter by Unread"}
                    </button>
                    {!showAll && notificationsToShow.length !== 0 && (
                        <button onClick={markAllRead}>Mark all read</button>
                    )}
                </div>
                {notificationsToShow.map((notification) => (
                    <Notification
                        key={notification.id}
                        notification={notification}
                        setNotifications={setNotifications}
                        setShowModal={setShowModal}
                        history={history}
                    />
                ))}
                {notificationsToShow.length === 0 && (
                    <div className="label-modal__no-notif">
                        <img src={nonotif} />
                        <p>No Notifications</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const appendTargetTitleVerbs = [
    "assigned you to",
    "invited you to",
    "made you admin of",
];

const formatNotification = (notification) => {
    if (appendTargetTitleVerbs.includes(notification.verb))
        return `${notification.verb} ${notification.target.title}`;
    else if (notification.verb === "commented")
        return `${notification.action_object.body}`;
};

const iconMap = {
    "assigned you to": "fal fa-user-plus",
    "invited you to": "fal fa-paper-plane",
    "made you admin of": "fal fa-arrow-up",
    commented: "fal fa-comment",
};

const Notification = ({
    notification,
    setNotifications,
    setShowModal,
    history,
}) => {
    const {
        actor,
        verb,
        target,
        target_model,
        action_object,
        created_at,
    } = notification;

    const acceptInvite = async () => {
        if (!action_object || !action_object.token) return;
        try {
            await authAxios.post(
                `${backendUrl}/projects/join/${action_object.token}/`
            );
            setNotifications((prev) =>
                (prev || []).filter((n) => n.id !== notification.id)
            );
            setShowModal(false);
            if (target && target.id) history.push(`/p/${target.id}`);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="notification">
            {target_model === "Item" && (
                <div className="notification__card">
                    <Labels labels={target.labels} />
                    <p>{target.title}</p>
                </div>
            )}
            <div className="notification__header">
                <ProfilePic user={actor} large={true} />
                <p className="notification__name">{actor.full_name}</p>
                <p className="notification__subtitle">
                    {timeSince(created_at)}
                </p>
            </div>

            <p className="notification__text">
                <i className={iconMap[verb]}></i>
                {formatNotification(notification)}
            </p>

            {verb === "invited you to" && action_object && action_object.token && (
                <div className="notification__actions">
                    <button className="btn" onClick={acceptInvite}>
                        Accept
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationsModal;
