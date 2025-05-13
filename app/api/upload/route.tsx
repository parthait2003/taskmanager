import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req) {
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) {
        return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    try {
        const formData = await req.formData();
        const files = formData.getAll("files"); // Match frontend's "files" field
        const imageNames = formData.getAll("imageNames") || files.map((_, i) => `file-${Date.now()}-${i}`); // Fallback names

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads");

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileUrls = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageName = imageNames[i] || `file-${Date.now()}-${i}`; // Fallback if imageNames[i] is missing

            if (!(file instanceof File)) {
                return NextResponse.json({ error: `Invalid file at index ${i}` }, { status: 400 });
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Sanitize file name to prevent security issues
            const sanitizedImageName = imageName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.\./g, "");
            const filePath = path.join(uploadDir, sanitizedImageName);
            fs.writeFileSync(filePath, buffer);

            console.log(`File saved at: ${filePath}`); // Debug log

            fileUrls.push(`/uploads/${sanitizedImageName}`);
        }

        return NextResponse.json({ success: true, urls: fileUrls });
    } catch (error) {
        console.error("Error uploading files:", error);
        return NextResponse.json(
            { error: `Something went wrong: ${error.message}` },
            { status: 500 }
        );
    }
}

export const runtime = "nodejs";