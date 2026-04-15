import React, { useState } from "react";
import { useHistory } from "react-router-dom";

import HomeSidebar from "../components/sidebars/HomeSidebar";
import useAxiosGet from "../hooks/useAxiosGet";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { backendUrl } from "../static/js/const";
import { authAxios } from "../static/js/util";

const TEMPLATES = [
    {
        id: "basic-kanban",
        title: "Basic Kanban",
        description: "A simple board to track work from start to finish.",
        color: "0079bf",
        lists: [
            {
                title: "To Do",
                cards: [
                    { title: "Add your first card" },
                    { title: "Invite teammates" },
                ],
            },
            {
                title: "Doing",
                cards: [{ title: "Move cards as you work" }],
            },
            {
                title: "Done",
                cards: [{ title: "Ship it" }],
            },
        ],
    },
    {
        id: "project-roadmap",
        title: "Project Roadmap",
        description: "Plan milestones and track progress across stages.",
        color: "61bd4f",
        lists: [
            {
                title: "Backlog",
                cards: [{ title: "Ideas" }, { title: "Research" }],
            },
            {
                title: "In Progress",
                cards: [{ title: "Current milestone" }],
            },
            {
                title: "Review",
                cards: [{ title: "QA" }],
            },
            {
                title: "Done",
                cards: [{ title: "Release" }],
            },
        ],
    },
    {
        id: "weekly-plan",
        title: "Weekly Plan",
        description: "Organize tasks for the week and keep priorities clear.",
        color: "f2d600",
        lists: [
            {
                title: "This Week",
                cards: [{ title: "Top priorities" }, { title: "Meetings" }],
            },
            {
                title: "Today",
                cards: [{ title: "Most important task" }],
            },
            {
                title: "Done",
                cards: [{ title: "Wrap up" }],
            },
        ],
    },
];

const Templates = () => {
    useDocumentTitle("Templates | Trello");
    const history = useHistory();

    const { data: projects } = useAxiosGet("/projects/");

    const [creatingTemplateId, setCreatingTemplateId] = useState(null);
    const [error, setError] = useState(null);

    const createFromTemplate = async (template) => {
        setError(null);
        setCreatingTemplateId(template.id);

        try {
            const { data: board } = await authAxios.post(`${backendUrl}/boards/`, {
                title: template.title,
                color: template.color,
            });

            for (const listDef of template.lists) {
                const { data: list } = await authAxios.post(
                    `${backendUrl}/boards/lists/`,
                    {
                        board: board.id,
                        title: listDef.title,
                    }
                );

                for (const cardDef of listDef.cards) {
                    await authAxios.post(`${backendUrl}/boards/items/`, {
                        list: list.id,
                        title: cardDef.title,
                        description: cardDef.description || "",
                    });
                }
            }

            history.push(`/workspace?tab=board&board=${board.id}`);
        } catch (e) {
            setError(e?.response?.data || e?.message || "Failed to create board");
            setCreatingTemplateId(null);
        }
    };

    return (
        <div className="home-wrapper">
            <HomeSidebar projects={projects || []} setShowTeamModal={() => {}} />
            <div className="home">
                <div className="home__section">
                    <p className="home__title">
                        <i className="fal fa-ruler-triangle"></i> Templates
                    </p>
                </div>

                {error && <div className="home__empty">{String(error)}</div>}

                <div className="home__boards">
                    {TEMPLATES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className="board-preview template-card"
                            onClick={() => createFromTemplate(t)}
                            disabled={creatingTemplateId !== null}
                            aria-label={`Create board from template: ${t.title}`}
                        >
                            <div
                                className="board-preview__color"
                                style={{ backgroundColor: `#${t.color}` }}
                            ></div>
                            <p className="board-preview__title">{t.title}</p>
                            <p className="template-card__desc">{t.description}</p>
                            {creatingTemplateId === t.id ? (
                                <p className="template-card__meta">Creating…</p>
                            ) : (
                                <p className="template-card__meta">Use template</p>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Templates;
