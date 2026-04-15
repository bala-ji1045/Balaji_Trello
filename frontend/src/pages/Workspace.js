import React, { useContext, useMemo, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";

import globalContext from "../context/globalContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { authAxios } from "../static/js/util";
import { backendUrl } from "../static/js/const";
import Inbox from "./Inbox";
import Schedule from "./Schedule";
import Board from "./Board";

const getLastBoardId = () => {
    try {
        const id = window.localStorage.getItem("lastBoardId");
        if (id && String(id).trim() !== "") return String(id);
    } catch (e) {
        // ignore
    }
    return null;
};

const Workspace = () => {
    useDocumentTitle("Workspace | Trello");

    const history = useHistory();
    const location = useLocation();

    const params = useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );

    const tab = params.get("tab") || "board";
    const boardParam = params.get("board");
    const activeBoardId = boardParam || getLastBoardId();

    const setQuery = (updates) => {
        const next = new URLSearchParams(location.search);
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null || v === undefined || String(v).trim() === "")
                next.delete(k);
            else next.set(k, String(v));
        });

        const search = next.toString();
        history.replace({
            pathname: "/workspace",
            search: search ? `?${search}` : "",
        });
    };

    const setTab = (nextTab) => {
        setQuery({
            tab: nextTab,
            ...(nextTab === "board" ? {} : { card: null }),
        });
    };

    const openCard = ({ boardId, cardId }) => {
        if (!boardId || !cardId) return;
        setQuery({ tab: "board", board: boardId, card: cardId });
    };

    const closeCard = () => {
        setQuery({ card: null });
    };

    const panelClass = (key) =>
        `workspace__panel workspace__panel--${key}${
            tab === key ? " workspace__panel--active" : ""
        }`;

    return (
        <div className="workspace">
            <div className="workspace__grid" aria-label="Inbox, Planner and Board">
                <section className={panelClass("inbox")}>
                    <div className="workspace__panel-header">
                        <div className="workspace__panel-title">
                            <i className="fal fa-inbox" aria-hidden="true"></i>
                            <span>Inbox</span>
                        </div>
                        <div className="workspace__panel-actions">
                            <button
                                type="button"
                                className={`btn btn--transparent btn--small${
                                    tab === "inbox" ? " btn--active" : ""
                                }`}
                                onClick={() => setTab("inbox")}
                            >
                                Focus
                            </button>
                        </div>
                    </div>
                    <div className="workspace__panel-body">
                        <InboxPanel
                            activeBoardId={activeBoardId}
                            openCard={openCard}
                        />
                        <div className="workspace__panel-divider" />
                        <Inbox
                            embedded={true}
                            onOpenTarget={(notification) => {
                                if (
                                    notification?.target_model === "Item" &&
                                    notification?.target?.board_id &&
                                    notification?.target?.id
                                ) {
                                    openCard({
                                        boardId: notification.target.board_id,
                                        cardId: notification.target.id,
                                    });
                                    return;
                                }
                                if (
                                    notification?.target_model === "Project" &&
                                    notification?.target?.id
                                ) {
                                    history.push(`/p/${notification.target.id}`);
                                }
                            }}
                        />
                    </div>
                </section>

                <section className={panelClass("planner")}>
                    <div className="workspace__panel-header">
                        <div className="workspace__panel-title">
                            <i
                                className="fal fa-calendar-alt"
                                aria-hidden="true"
                            ></i>
                            <span>Planner</span>
                        </div>
                        <div className="workspace__panel-actions">
                            <button
                                type="button"
                                className={`btn btn--transparent btn--small${
                                    tab === "planner" ? " btn--active" : ""
                                }`}
                                onClick={() => setTab("planner")}
                            >
                                Focus
                            </button>
                        </div>
                    </div>
                    <div className="workspace__panel-body">
                        <Schedule
                            embedded={true}
                            onOpenItem={(item) =>
                                openCard({
                                    boardId: item.board_id,
                                    cardId: item.id,
                                })
                            }
                        />
                    </div>
                </section>

                <section className={panelClass("board")}>
                    <div className="workspace__panel-header">
                        <div className="workspace__panel-title">
                            <i className="fab fa-trello" aria-hidden="true"></i>
                            <span>Board</span>
                        </div>
                        <div className="workspace__panel-actions">
                            <button
                                type="button"
                                className={`btn btn--transparent btn--small${
                                    tab === "board" ? " btn--active" : ""
                                }`}
                                onClick={() => setTab("board")}
                            >
                                Focus
                            </button>
                            <Link
                                to="/"
                                className="btn btn--secondary btn--small"
                            >
                                Switch boards
                            </Link>
                        </div>
                    </div>

                    <div className="workspace__panel-body workspace__panel-body--board">
                        {!activeBoardId ? (
                            <div className="home__empty">
                                Open a board to see it here.
                            </div>
                        ) : (
                            <Board
                                embedded={true}
                                match={{ params: { id: String(activeBoardId) } }}
                                location={location}
                                history={history}
                                onCloseDeepLink={closeCard}
                            />
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

const InboxPanel = ({ activeBoardId, openCard }) => {
    const { board, setBoard } = useContext(globalContext);

    const [mode, setMode] = useState("cards");
    const [title, setTitle] = useState("");
    const [saving, setSaving] = useState(false);

    const boardMatches =
        Boolean(board) && String(board?.id) === String(activeBoardId);

    const inboxList = useMemo(() => {
        if (!boardMatches) return null;
        const lists = board?.lists || [];
        return lists.find(
            (l) => String(l.title || "").trim().toLowerCase() === "inbox"
        );
    }, [board, boardMatches]);

    const canAdd =
        Boolean(activeBoardId) &&
        boardMatches &&
        typeof setBoard === "function";

    const ensureInboxList = async () => {
        if (!board || !setBoard) return null;
        if (inboxList) return inboxList;
        const { data } = await authAxios.post(`${backendUrl}/boards/lists/`, {
            board: board.id,
            title: "Inbox",
        });
        const listWithItems = {
            ...data,
            items: Array.isArray(data.items) ? data.items : [],
        };
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                lists: [...(prev.lists || []), listWithItems],
            };
        });
        return listWithItems;
    };

    const addInboxCard = async (e) => {
        e.preventDefault();
        if (!canAdd) return;
        const trimmed = title.trim();
        if (trimmed === "") return;
        setSaving(true);
        try {
            const list = await ensureInboxList();
            if (!list) return;

            const { data } = await authAxios.post(`${backendUrl}/boards/items/`, {
                list: list.id,
                title: trimmed,
            });

            setBoard((prev) => {
                if (!prev) return prev;
                const nextLists = (prev.lists || []).map((l) =>
                    l.id === list.id
                        ? { ...l, items: [...(l.items || []), data] }
                        : l
                );
                return { ...prev, lists: nextLists };
            });
            setTitle("");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="workspace-inbox">
            <div className="workspace-inbox__tabs" role="tablist" aria-label="Inbox mode">
                <button
                    type="button"
                    className={`btn btn--transparent btn--small${
                        mode === "cards" ? " btn--active" : ""
                    }`}
                    onClick={() => setMode("cards")}
                    role="tab"
                    aria-selected={mode === "cards"}
                >
                    Cards
                </button>
                <button
                    type="button"
                    className={`btn btn--transparent btn--small${
                        mode === "notifications" ? " btn--active" : ""
                    }`}
                    onClick={() => setMode("notifications")}
                    role="tab"
                    aria-selected={mode === "notifications"}
                >
                    Notifications
                </button>
            </div>

            {mode === "cards" ? (
                <>
                    <form className="workspace-inbox__add" onSubmit={addInboxCard}>
                        <input
                            type="text"
                            placeholder={
                                canAdd
                                    ? "Add a card"
                                    : "Open a board to add cards"
                            }
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!canAdd || saving}
                        />
                        <button
                            type="submit"
                            className={`btn btn--small${
                                title.trim() === "" || saving || !canAdd
                                    ? " btn--disabled"
                                    : ""
                            }`}
                            disabled={title.trim() === "" || saving || !canAdd}
                        >
                            Add
                        </button>
                    </form>

                    {inboxList && (inboxList.items || []).length > 0 ? (
                        <div className="workspace-inbox__cards">
                            {(inboxList.items || []).map((card) => (
                                <button
                                    type="button"
                                    key={card.id}
                                    className="workspace-inbox-card"
                                    onClick={() =>
                                        openCard({
                                            boardId: activeBoardId,
                                            cardId: card.id,
                                        })
                                    }
                                >
                                    <span className="workspace-inbox-card__title">
                                        {card.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="workspace-inbox__hint">
                            See it, send it, save it for later.
                        </div>
                    )}
                </>
            ) : (
                <div className="workspace-inbox__hint">
                    Notifications are listed below.
                </div>
            )}
        </div>
    );
};

export default Workspace;
