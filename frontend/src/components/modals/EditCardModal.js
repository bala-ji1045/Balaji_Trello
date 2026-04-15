import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { v4 as uuidv4 } from "uuid";

import Labels from "../boards/Labels";
import LabelModal from "./LabelModal";
import { getEditControlsSidePosition } from "../boards/Card";
import useAxiosGet from "../../hooks/useAxiosGet";
import useBlurSetState from "../../hooks/useBlurSetState";
import globalContext from "../../context/globalContext";
import {
    timeSince,
    modalBlurHandler,
    authAxios,
    getAddBoardStyle,
} from "../../static/js/util";
import { backendUrl, colors } from "../../static/js/const";
import { updateCard } from "../../static/js/board";
import ProfilePic from "../boards/ProfilePic";

const EditCardModal = ({ card, list, setShowModal }) => {
    const { board, setBoard } = useContext(globalContext);
    const modalElem = useRef(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);

    const [showLabelModal, setShowLabelModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDueDateModal, setShowDueDateModal] = useState(false);
    const [showCoverModal, setShowCoverModal] = useState(false);

    const editLabelsButtonRef = useRef(null);
    const changeMembersButtonRef = useRef(null);
    const moveButtonRef = useRef(null);
    const dueDateButtonRef = useRef(null);
    const coverButtonRef = useRef(null);

    useEffect(modalBlurHandler(setShowModal), []);
    useBlurSetState(".edit-modal__title-edit", editingTitle, setEditingTitle);
    useBlurSetState(
        ".edit-modal__form",
        editingDescription,
        setEditingDescription
    );

    const {
        data: comments,
        addItem: addComment,
        replaceItem: replaceComment,
        removeItem: removeComment,
    } = useAxiosGet(`/boards/comments/?item=${card.id}`);

    const formattedDueDate = useMemo(() => {
        if (!card.due_date) return "";
        const date = new Date(card.due_date);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [card.due_date]);

    return (
        <div className="edit-modal" ref={modalElem}>
            <button
                className="edit-modal__exit"
                onClick={() => setShowModal(false)}
            >
                <i className="fal fa-times"></i>
            </button>
            <div className="edit-modal__cols">
                <div className="edit-modal__left">
                    <Labels labels={card.labels} />
                    {!editingTitle ? (
                        <p
                            onClick={() => setEditingTitle(true)}
                            className="edit-modal__title"
                        >
                            {card.title}
                        </p>
                    ) : (
                        <EditCardTitle
                            list={list}
                            card={card}
                            setEditingTitle={setEditingTitle}
                        />
                    )}
                    <div className="edit-modal__subtitle">
                        in list <span>{list.title}</span>
                    </div>

                    {((card.assigned_to || []).length > 0 || card.due_date) && (
                        <div className="edit-modal__meta">
                            {(card.assigned_to || []).length > 0 && (
                                <div className="edit-modal__meta-block">
                                    <p className="edit-modal__meta-title">
                                        Members
                                    </p>
                                    <div className="edit-modal__meta-members">
                                        {card.assigned_to.map((member) => (
                                            <ProfilePic
                                                user={member}
                                                key={member.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {card.due_date && (
                                <div className="edit-modal__meta-block">
                                    <p className="edit-modal__meta-title">
                                        Due date
                                    </p>
                                    <div className="edit-modal__meta-value">
                                        <i className="fal fa-clock"></i>{" "}
                                        {formattedDueDate}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="edit-modal__section-header">
                        <div>
                            <i className="fal fa-file-alt"></i> Description
                        </div>
                        {card.description !== "" && (
                            <div>
                                <button
                                    className="btn btn--secondary btn--small"
                                    onClick={() => setEditingDescription(true)}
                                >
                                    <i className="fal fa-pencil"></i> Edit
                                </button>
                            </div>
                        )}
                    </div>

                    {card.description !== "" && !editingDescription && (
                        <p className="edit-modal__description">
                            {card.description}
                        </p>
                    )}

                    {editingDescription ? (
                        <EditCardDescription
                            list={list}
                            card={card}
                            setEditingDescription={setEditingDescription}
                        />
                    ) : (
                        card.description === "" && (
                            <button
                                className="btn btn--secondary btn--small btn--description"
                                onClick={() => setEditingDescription(true)}
                            >
                                Add description
                            </button>
                        )
                    )}

                    <div
                        className="edit-modal__section-header"
                        style={
                            card.attachments.length === 0
                                ? {
                                      marginBottom: "1.75em",
                                  }
                                : null
                        }
                    >
                        <div>
                            <i className="fal fa-paperclip"></i> Attachments
                        </div>
                        <div>
                            <a className="btn btn--secondary btn--small">
                                <i className="fal fa-plus"></i> Add
                            </a>
                        </div>
                    </div>

                    <Attachments attachments={card.attachments} />
                    <CommentForm
                        card={card}
                        style={
                            (comments || []).length === 0
                                ? { marginBottom: 0 }
                                : null
                        }
                        addComment={addComment}
                    />
                    <Comments
                        card={card}
                        comments={comments || []}
                        replaceComment={replaceComment}
                        removeComment={removeComment}
                    />
                </div>

                <div className="edit-modal__right">
                    <div className="edit-modal__section-header">
                        <div>Actions</div>
                    </div>

                    <ul className="edit-modal__actions">
                        <li>
                            <button
                                className="btn btn--secondary btn--small"
                                ref={editLabelsButtonRef}
                                onClick={() => {
                                    setShowLabelModal(true);
                                    setShowMembersModal(false);
                                    setShowMoveModal(false);
                                    setShowDueDateModal(false);
                                    setShowCoverModal(false);
                                }}
                            >
                                <i className="fal fa-tags"></i> Edit Labels
                            </button>
                        </li>
                        <li>
                            <button
                                className="btn btn--secondary btn--small"
                                ref={changeMembersButtonRef}
                                onClick={() => {
                                    setShowMembersModal(true);
                                    setShowLabelModal(false);
                                    setShowMoveModal(false);
                                    setShowDueDateModal(false);
                                    setShowCoverModal(false);
                                }}
                            >
                                <i className="fal fa-user"></i> Change Members
                            </button>
                        </li>
                        <li>
                            <button
                                className="btn btn--secondary btn--small"
                                ref={moveButtonRef}
                                onClick={() => {
                                    setShowMoveModal(true);
                                    setShowLabelModal(false);
                                    setShowMembersModal(false);
                                    setShowDueDateModal(false);
                                    setShowCoverModal(false);
                                }}
                            >
                                <i className="fal fa-arrow-right"></i> Move
                            </button>
                        </li>
                        <li>
                            <button
                                className="btn btn--secondary btn--small"
                                ref={dueDateButtonRef}
                                onClick={() => {
                                    setShowDueDateModal(true);
                                    setShowLabelModal(false);
                                    setShowMembersModal(false);
                                    setShowMoveModal(false);
                                    setShowCoverModal(false);
                                }}
                            >
                                <i className="fal fa-clock"></i> Change Due Date
                            </button>
                        </li>
                        <li>
                            <button
                                className="btn btn--secondary btn--small"
                                ref={coverButtonRef}
                                onClick={() => {
                                    setShowCoverModal(true);
                                    setShowLabelModal(false);
                                    setShowMembersModal(false);
                                    setShowMoveModal(false);
                                    setShowDueDateModal(false);
                                }}
                            >
                                <i className="fal fa-image"></i> Cover
                            </button>
                        </li>
                    </ul>

                    <Members members={card.assigned_to} />
                </div>
            </div>

            {showLabelModal && (
                <LabelModal
                    card={card}
                    list={list}
                    cardElem={editLabelsButtonRef}
                    containerElem={modalElem.current}
                    setShowModal={setShowLabelModal}
                />
            )}

            {showMembersModal && (
                <MembersPopover
                    card={card}
                    list={list}
                    anchorRef={changeMembersButtonRef}
                    containerElem={modalElem.current}
                    onClose={() => setShowMembersModal(false)}
                />
            )}

            {showMoveModal && (
                <MovePopover
                    card={card}
                    list={list}
                    anchorRef={moveButtonRef}
                    containerElem={modalElem.current}
                    onClose={() => setShowMoveModal(false)}
                    onMoved={() => {
                        setShowMoveModal(false);
                        setShowModal(false);
                    }}
                />
            )}

            {showDueDateModal && (
                <DueDatePopover
                    card={card}
                    list={list}
                    anchorRef={dueDateButtonRef}
                    containerElem={modalElem.current}
                    onClose={() => setShowDueDateModal(false)}
                />
            )}

            {showCoverModal && (
                <CoverPopover
                    card={card}
                    list={list}
                    anchorRef={coverButtonRef}
                    containerElem={modalElem.current}
                    onClose={() => setShowCoverModal(false)}
                />
            )}
        </div>
    );
};

const MembersPopover = ({ card, list, anchorRef, containerElem, onClose }) => {
    const { board, setBoard } = useContext(globalContext);
    const [username, setUsername] = useState("");

    const toggleMember = async (e) => {
        e.preventDefault();
        if (username.trim() === "") return;

        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                assigned_to: username.trim(),
            }
        );
        updateCard(board, setBoard)(list.id, data);
        setUsername("");
    };

    return (
        <div
            style={getEditControlsSidePosition(
                anchorRef.current,
                40,
                320,
                360,
                containerElem
            )}
            className="label-modal"
        >
            <div className="label-modal__header">
                <p>Members</p>
                <button onClick={onClose}>
                    <i className="fal fa-times"></i>
                </button>
            </div>

            <div className="label-modal__content">
                <p className="label-modal__title">Toggle by username</p>
                <form onSubmit={toggleMember}>
                    <input
                        className="label-modal__input"
                        placeholder="Enter username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <button
                        className={
                            username.trim() === ""
                                ? "btn label-modal__create-button btn--disabled"
                                : "btn label-modal__create-button"
                        }
                        disabled={username.trim() === ""}
                        type="submit"
                        style={{ width: "auto" }}
                    >
                        Toggle
                    </button>
                </form>

                {card.assigned_to.length !== 0 && (
                    <>
                        <p className="label-modal__labels-head">Assigned</p>
                        <ul className="label-modal__labels-block">
                            {card.assigned_to.map((member) => (
                                <li key={member.id} className="label-modal__label">
                                    <p style={{ backgroundColor: "#DFE1E6" }}>
                                        @{member.username}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
};

const getDateTimeLocalValue = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const DueDatePopover = ({ card, list, anchorRef, containerElem, onClose }) => {
    const { board, setBoard } = useContext(globalContext);
    const [value, setValue] = useState(getDateTimeLocalValue(card.due_date));

    const save = async (e) => {
        e.preventDefault();
        if (value.trim() === "") return;

        const iso = new Date(value).toISOString();
        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                due_date: iso,
            }
        );
        updateCard(board, setBoard)(list.id, data);
        onClose();
    };

    const clear = async () => {
        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                due_date: null,
            }
        );
        updateCard(board, setBoard)(list.id, data);
        onClose();
    };

    return (
        <div
            style={getEditControlsSidePosition(
                anchorRef.current,
                40,
                320,
                360,
                containerElem
            )}
            className="label-modal"
        >
            <div className="label-modal__header">
                <p>Due Date</p>
                <button onClick={onClose}>
                    <i className="fal fa-times"></i>
                </button>
            </div>

            <div className="label-modal__content">
                <form onSubmit={save}>
                    <input
                        className="label-modal__input"
                        type="datetime-local"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <button
                        type="submit"
                        className={
                            value.trim() === ""
                                ? "btn label-modal__create-button btn--disabled"
                                : "btn label-modal__create-button"
                        }
                        disabled={value.trim() === ""}
                    >
                        Save
                    </button>
                </form>
                <button
                    onClick={clear}
                    className="btn btn--secondary btn--small"
                    style={{ marginTop: "0.75em" }}
                >
                    Remove due date
                </button>
            </div>
        </div>
    );
};

const MovePopover = ({
    card,
    list,
    anchorRef,
    containerElem,
    onClose,
    onMoved,
}) => {
    const { board, setBoard } = useContext(globalContext);
    const [destinationListId, setDestinationListId] = useState(list.id);

    const lists = useMemo(() => board?.lists || [], [board]);

    const move = async (e) => {
        e.preventDefault();
        if (!destinationListId) return;

        const destinationList = lists.find((l) => l.id === Number(destinationListId));
        const lastOrder =
            destinationList?.items?.length
                ? parseFloat(destinationList.items[destinationList.items.length - 1].order)
                : 0;
        const newOrder = (lastOrder + 65535).toFixed(15);

        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                list: Number(destinationListId),
                order: newOrder,
            }
        );

        setBoard((prevBoard) => {
            if (!prevBoard) return prevBoard;
            const sourceListId = list.id;
            const destId = Number(destinationListId);

            const newLists = prevBoard.lists.map((l) => {
                if (l.id === sourceListId) {
                    return {
                        ...l,
                        items: (l.items || []).filter((it) => it.id !== data.id),
                    };
                }
                if (l.id === destId) {
                    return {
                        ...l,
                        items: [...(l.items || []).filter((it) => it.id !== data.id), data],
                    };
                }
                return l;
            });

            return {
                ...prevBoard,
                lists: newLists,
            };
        });

        onMoved();
    };

    return (
        <div
            style={getEditControlsSidePosition(
                anchorRef.current,
                40,
                320,
                360,
                containerElem
            )}
            className="label-modal"
        >
            <div className="label-modal__header">
                <p>Move</p>
                <button onClick={onClose}>
                    <i className="fal fa-times"></i>
                </button>
            </div>
            <div className="label-modal__content">
                <p className="label-modal__title">Destination list</p>
                <form onSubmit={move}>
                    <select
                        className="label-modal__input"
                        value={destinationListId}
                        onChange={(e) => setDestinationListId(e.target.value)}
                    >
                        {lists.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.title}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="btn label-modal__create-button">
                        Move
                    </button>
                </form>
            </div>
        </div>
    );
};

const CoverPopover = ({ card, list, anchorRef, containerElem, onClose }) => {
    const { board, setBoard } = useContext(globalContext);

    const setColor = async (hexWithHash) => {
        const color = hexWithHash.substring(1);
        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                color,
            }
        );
        updateCard(board, setBoard)(list.id, data);
        onClose();
    };

    const clear = async () => {
        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                color: "",
            }
        );
        updateCard(board, setBoard)(list.id, data);
        onClose();
    };

    return (
        <div
            style={getEditControlsSidePosition(
                anchorRef.current,
                40,
                320,
                360,
                containerElem
            )}
            className="label-modal"
        >
            <div className="label-modal__header">
                <p>Cover</p>
                <button onClick={onClose}>
                    <i className="fal fa-times"></i>
                </button>
            </div>
            <div className="label-modal__content">
                <p className="label-modal__labels-head">Colors</p>
                <ul className="label-modal__create-block">
                    {colors.map((colorOption) => (
                        <li
                            key={colorOption[0]}
                            className="label-modal__create-label"
                        >
                            <button
                                onClick={() => setColor(colorOption[0])}
                                style={getAddBoardStyle(...colorOption)}
                            >
                                {card.color === colorOption[0].substring(1) ? (
                                    <i className="fal fa-check"></i>
                                ) : null}
                            </button>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={clear}
                    className="btn btn--secondary btn--small"
                    style={{ marginTop: "0.75em" }}
                >
                    Remove cover
                </button>
            </div>
        </div>
    );
};

const EditCardTitle = ({ list, card, setEditingTitle }) => {
    const { board, setBoard } = useContext(globalContext);
    const [title, setTitle] = useState(card.title);

    useEffect(() => {
        const titleInput = document.querySelector(".edit-modal__title-edit");
        titleInput.focus();
        titleInput.select();
    }, []);

    const onEditTitle = async (e) => {
        e.preventDefault();
        if (title.trim() === "") return;
        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title,
            }
        );
        setEditingTitle(false);
        updateCard(board, setBoard)(list.id, data);
    };

    return (
        <form onSubmit={onEditTitle}>
            <input
                className="edit-modal__title-edit"
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            ></input>
        </form>
    );
};

const EditCardDescription = ({ list, card, setEditingDescription }) => {
    const { board, setBoard } = useContext(globalContext);
    const [description, setDescription] = useState(card.description);

    const onEditDesc = async (e) => {
        e.preventDefault();
        if (description.trim() === "") return;
        const { data } = await authAxios.put(
            `${backendUrl}/boards/items/${card.id}/`,
            {
                title: card.title,
                description,
            }
        );
        setEditingDescription(false);
        updateCard(board, setBoard)(list.id, data);
    };

    return (
        <form className="edit-modal__form" onSubmit={onEditDesc}>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
            ></textarea>
            {description.trim() !== "" && (
                <button type="submit" className="btn btn--small">
                    Save
                </button>
            )}
        </form>
    );
};

const Attachments = ({ attachments }) =>
    attachments.length !== 0 && (
        <ul className="edit-modal__attachments">
            {attachments.map((attachment) => (
                <li key={uuidv4()}>
                    <div className="attachment">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Typescript_logo_2020.svg/512px-Typescript_logo_2020.svg.png" />
                        <div className="attachment__content">
                            <div className="attachment__subtitle">
                                {timeSince(attachment.created_at)}
                            </div>
                            <div className="attachment__title">
                                {attachment.title}
                            </div>
                            <div className="attachment__buttons">
                                <a className="btn btn--secondary btn--small">
                                    Download
                                </a>
                                <a className="btn btn--secondary btn--small">
                                    Delete
                                </a>
                            </div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );

const Comments = ({ card, comments, replaceComment, removeComment }) => {
    const { authUser } = useContext(globalContext);
    const [isEditing, setIsEditing] = useState(false);
    useBlurSetState(".edit-modal__form--comment", isEditing, setIsEditing);

    if (comments.length === 0) return null;

    const onDelete = async (comment) => {
        await authAxios.delete(`${backendUrl}/boards/comments/${comment.id}/`);
        removeComment(comment.id);
    };

    return (
        <ul className="edit-modal__comments">
            {comments.map((comment) => (
                <li key={uuidv4()}>
                    <div className="comment">
                        <div className="comment__header">
                            <div className="comment__header-left">
                                <ProfilePic user={comment.author} />
                                <div className="comment__info">
                                    <p>{comment.author.full_name}</p>
                                    <p>{timeSince(comment.created_at)}</p>
                                </div>
                            </div>
                            {comment.author.username === authUser.username && (
                                <div className="comment__header-right">
                                    <button
                                        onClick={() => setIsEditing(comment.id)}
                                    >
                                        Edit
                                    </button>{" "}
                                    -{" "}
                                    <button onClick={() => onDelete(comment)}>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                        {isEditing !== comment.id ? (
                            <div className="comment__content">
                                {comment.body}
                            </div>
                        ) : (
                            <CommentForm
                                card={card}
                                comment={comment}
                                replaceComment={replaceComment}
                                setIsEditing={setIsEditing}
                            />
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
};

const CommentForm = ({
    card,
    comment,
    style,
    addComment,
    replaceComment,
    setIsEditing,
}) => {
    // If comment not null, edit form
    const [commentBody, setCommentBody] = useState(comment ? comment.body : "");

    const onAddComment = async (e) => {
        e.preventDefault();
        if (commentBody.trim() === "") return;
        const { data } = await authAxios.post(
            `${backendUrl}/boards/comments/`,
            {
                item: card.id,
                body: commentBody,
            }
        );
        addComment(data);
        setCommentBody("");
    };

    const onEditComment = async (e) => {
        e.preventDefault();
        if (commentBody.trim() === "") return;
        const { data } = await authAxios.put(
            `${backendUrl}/boards/comments/${comment.id}/`,
            {
                body: commentBody,
            }
        );
        replaceComment(data);
        setIsEditing(false);
    };

    // Modifier is only for useBlurSetState, as doc.querySelector is selecting description form otherwise
    // Only add if comment is not null, otherwise doc.querySelector selects create comment form
    return (
        <form
            className={`edit-modal__form${
                comment ? " edit-modal__form--comment" : ""
            }`}
            style={style}
            onSubmit={comment ? onEditComment : onAddComment}
        >
            <textarea
                placeholder="Leave a comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
            ></textarea>
            {commentBody.trim() !== "" && (
                <button className="btn btn--small" type="submit">
                    Comment
                </button>
            )}
        </form>
    );
};

const Members = ({ members }) =>
    members.length !== 0 && (
        <>
            <div className="edit-modal__section-header">
                <div>Members</div>
            </div>
            <ul className="edit-modal__members">
                {members.map((member) => (
                    <li key={uuidv4()}>
                        <ProfilePic user={member} />
                        <p>{member.full_name}</p>
                    </li>
                ))}
            </ul>
        </>
    );

export default EditCardModal;
