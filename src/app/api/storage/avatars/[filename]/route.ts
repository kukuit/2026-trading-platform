import { NextResponse } from "next/server";
import { avatarContentType, readAvatarFile } from "@/lib/avatarStorage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } },
) {
  const contentType = avatarContentType(params.filename);
  if (!contentType) {
    return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
  }

  try {
    const file = await readAvatarFile(params.filename);
    if (!file) {
      return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
    }

    return new NextResponse(new Blob([new Uint8Array(file)], { type: contentType }), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
    }

    throw error;
  }
}
