import { ImageResponse } from "next/og";

export const alt = "CSP Lab Manager. An address for every report-uri.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK = "CSP Lab";
const LABEL = "report-uri";
const URL_TEXT =
  "https://reports.example/endpoint/storefront?apiKey=7f3c…";

// shortcut: fonts come from Google at render time, vendor the files if this image must build offline
async function loadFont(family: string, weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
      },
    },
  ).then((res) => res.text());
  const match = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
  );
  if (!match) throw new Error(`No font file for ${family}`);
  return fetch(match[1]).then((res) => res.arrayBuffer());
}

export default async function OpenGraphImage() {
  const [display, mono] = await Promise.all([
    loadFont("Bricolage+Grotesque", 700, "An address for every report-uri."),
    loadFont("IBM+Plex+Mono", 500, `${MARK}${LABEL}${URL_TEXT}`),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px 60px",
          backgroundColor: "#e8edef",
          backgroundImage:
            "linear-gradient(to right, rgba(10, 28, 39, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(10, 28, 39, 0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          color: "#0a1c27",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 22,
              height: 22,
              backgroundColor: "#c63a20",
              boxShadow: "6px 6px 0 rgba(10, 28, 39, 0.22)",
            }}
          />
          <div
            style={{
              fontFamily: "IBM Plex Mono",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {MARK}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Bricolage Grotesque",
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 0.93,
            letterSpacing: "-0.052em",
          }}
        >
          <div>An address for</div>
          <div>every report-uri.</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderLeft: "6px solid #c63a20",
            paddingLeft: 22,
          }}
        >
          <div
            style={{
              fontFamily: "IBM Plex Mono",
              fontSize: 22,
              fontWeight: 500,
              color: "#c63a20",
            }}
          >
            {LABEL}
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: "IBM Plex Mono",
              fontSize: 30,
              letterSpacing: "-0.03em",
            }}
          >
            {URL_TEXT}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bricolage Grotesque",
          data: display,
          weight: 700,
          style: "normal",
        },
        {
          name: "IBM Plex Mono",
          data: mono,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}
