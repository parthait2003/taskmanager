"use client";
import React, { useRef, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Swal from "sweetalert2";
import { format } from "date-fns";

const TaskDetailsPage = () => {
    const { id } = useParams();
    const [task, setTask] = useState(null);
    const [messages, setMessages] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [newFiles, setNewFiles] = useState([]);
    const [users, setUsers] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch users
                const resUsers = await fetch("/api/user");
                if (!resUsers.ok) throw new Error("Failed to fetch users");
                const userData = await resUsers.json();
                let usersArray = Array.isArray(userData) ? userData : Array.isArray(userData.data) ? userData.data : [];
                // Add type: "user" to userData
                usersArray = usersArray.map(user => ({
                    ...user,
                    type: "user",
                }));
                console.log("User data:", usersArray);

                // Fetch owners
                const resOwners = await fetch("/api/owner");
                if (!resOwners.ok) throw new Error("Failed to fetch owners");
                const ownerData = await resOwners.json();
                console.log("Owner data:", ownerData);
                const ownersArray = Array.isArray(ownerData.owners) ? ownerData.owners : [];
                console.log("Owners array:", ownersArray);

                // Map owners to normalized format
                const normalizedOwners = ownersArray.map((owner, index) => {
                    if (!owner._id || !owner.name) {
                        console.warn(`Invalid owner at index ${index}:`, owner);
                        return null;
                    }
                    const normalized = {
                        _id: String(owner._id),
                        username: owner.name || "Unknown Owner",
                        type: "owner",
                    };
                    console.log(`Normalized owner ${index}:`, normalized);
                    return normalized;
                }).filter(owner => owner !== null);
                console.log("Normalized owners:", normalizedOwners);

                // Combine users and owners
                const combinedUsers = [...usersArray, ...normalizedOwners];
                console.log("Combined users:", combinedUsers);
                setUsers(combinedUsers);
            } catch (err) {
                console.error("Error fetching users:", err);
                Swal.fire("Error", "Failed to fetch users or owners.", "error");
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        const fetchTaskDetails = async () => {
            try {
                const res = await fetch("/api/project");
                if (!res.ok) throw new Error("Failed to fetch projects");

                const json = await res.json();
                const projects = json.data;

                setProjects(projects);

                let foundTask = null;

                for (const project of projects) {
                    const task = project.tasks.find((task) => task._id === id);
                    if (task) {
                        const assignee = project.assignees[0];
                        foundTask = {
                            ...task,
                            projectId: project._id,
                            assignedBy: project.assignedBy,
                            assignee: assignee?.id || null,
                        };
                        break;
                    }
                }

                if (foundTask) {
                    setTask(foundTask);
                    fetchTaskMessages(foundTask._id);
                } else {
                    throw new Error("Task not found in any project");
                }
            } catch (err) {
                console.error("Error fetching task details:", err);
                Swal.fire("Error", "Failed to fetch task details.", "error");
            }
        };

        const fetchTaskMessages = async (taskId) => {
            try {
                const res = await fetch(`/api/taskMessage?taskId=${taskId}`);
                if (!res.ok) throw new Error("Failed to fetch task messages");

                const json = await res.json();
                setMessages(json.data || []);
            } catch (err) {
                console.error("Error fetching task messages:", err);
                Swal.fire("Error", "Failed to fetch task messages.", "error");
            }
        };

        if (id) {
            fetchTaskDetails();
        }
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const senderId = localStorage.getItem('userId');
        if (!senderId) {
            Swal.fire("Error", "User is not logged in", "error");
            return;
        }

        try {
            const res = await fetch("/api/taskMessage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: newMessage,
                    projectId: task.projectId,
                    taskId: task._id,
                    assigneeId: task.assignee,
                    senderId: senderId,
                    files: Array.from(newFiles).map(file => file.name),
                }),
            });

            if (!res.ok) throw new Error("Failed to add message");

            const updatedMessages = await res.json();
            setMessages((prev) => [...prev, updatedMessages.data]);
            setShowModal(false);
            setNewMessage("");
            setNewFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
            Swal.fire("Success", "Message is submitted successfully", "success");
        } catch (error) {
            Swal.fire("Error", "Could not add message.", "error");
        }
    };

    const getProjectName = (projectId) => {
        const project = projects.find(p => p._id === projectId);
        return project?.project || "Unknown Project";
    };

    const getTaskTitle = (projectId, taskId) => {
        const project = projects.find(p => p._id === projectId);
        const task = project?.tasks.find(t => t._id === taskId);
        return task?.title || "Unknown Task";
    };

    const getAssigneeName = (projectId, assigneeId) => {
        const project = projects.find(p => p._id === projectId);
        const assignee = project?.assignees.find(a => a.id === assigneeId);
        return assignee?.name || "Unknown Assignee";
    };

    const getSenderName = (userId) => {
        console.log("Looking for userId:", userId);
        const user = users.find((u) => String(u._id) === String(userId));
        console.log("Found user:", user);
        return {
            username: user?.username || "Unknown Sender",
            type: user?.type || "unknown",
        };
    };

    if (!task) {
        return (
            <div className="p-6 mt-6 bg-white shadow rounded-lg">
                <h5 className="text-xl font-semibold text-gray-700">Loading Task Details...</h5>
            </div>
        );
    }

    return (
        <div className="p-6 mt-6 bg-white shadow-md rounded-xl max-w-6xl w-full mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Task Details</h2>
            <div className="space-y-5 text-lg text-gray-800">
                <div><span className="font-bold">Title:</span> {task.title}</div>
                <div><span className="font-bold">Stage:</span> {task.stage}</div>
                <div><span className="font-bold">Status:</span> {task.status}</div>
                <div><span className="font-bold">Details:</span> {task.details || "No additional details provided."}</div>
                <div><span className="font-bold">Start Date:</span> {task.startDate ? format(new Date(task.startDate), "MM/dd/yyyy") : "N/A"}</div>
                <div><span className="font-bold">Due Date:</span> {task.dueDate ? format(new Date(task.dueDate), "MM/dd/yyyy") : "N/A"}</div>
            </div>

            {/* Task Messages Section */}
            <div className="mt-10">
                <h3 className="text-3xl font-semibold text-gray-700 mb-4 border-b pb-2">Task Messages</h3>
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Add Message
                    </button>
                </div>

                {messages.length === 0 ? (
                    <p className="text-gray-500 text-lg">No messages for this task.</p>
                ) : (
                    <ul className="space-y-4">
                        {messages.map((msg) => {
                            const { username, type } = getSenderName(msg.senderId);
                            const messageBgColor = type === "user" ? "bg-blue-100" : type === "owner" ? "bg-green-100" : "bg-gray-100";
                            return (
                                <li key={msg._id} className={`border p-4 rounded-lg shadow-sm ${messageBgColor} text-lg`}>
                                    <div><span className="font-semibold text-gray-800 text-xl">Project:</span> {getProjectName(msg.projectId)}</div>
                                    <div><span className="font-semibold text-gray-800 text-xl">Task:</span> {getTaskTitle(msg.projectId, msg.taskId)}</div>
                                    <div><span className="font-semibold text-gray-800 text-xl">Assignee:</span> {getAssigneeName(msg.projectId, msg.assigneeId)}</div>
                                    <div><span className="font-semibold text-gray-800 text-xl">Sender:</span> {username}</div>
                                    <div><span className="font-semibold text-gray-800 text-xl">Message:</span> {msg.message || "No message."}</div>
                                    <div><span className="font-semibold text-gray-800 text-xl">Files:</span> {msg.files.length > 0 ? msg.files.join(", ") : "No files"}</div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add New Message</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block font-medium mb-1">Message</label>
                                <textarea
                                    className="w-full p-2 border rounded"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block font-medium mb-1">File(s)</label>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={(e) => setNewFiles(e.target.files)}
                                    className="block w-full"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetailsPage;