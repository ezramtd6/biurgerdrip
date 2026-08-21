import { ImageResponse } from "next/og";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

async function getLogo(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/restaurant/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : data?.results?.[0] ?? data;
    return first?.logo ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const logo = await getLogo();

  try {
    return new ImageResponse(
      logo ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logo}
            alt=""
            width={64}
            height={64}
            style={{
              width: 64,
              height: 64,
              objectFit: "cover",
              borderRadius: 9999,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            borderRadius: 9999,
            backgroundColor: "#dc2626",
          }}
        />
      ),
      {
        width: 64,
        height: 64,
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            borderRadius: 9999,
            backgroundColor: "#dc2626",
          }}
        />
      ),
      { width: 64, height: 64 }
    );
  }
}
