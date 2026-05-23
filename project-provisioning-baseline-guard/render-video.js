const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const frames = [
  ["Problem", "New research workspaces can start with weak requester evidence, unsafe visibility, missing metadata, and overbroad initial grants."],
  ["Implementation", "The guard validates identity posture, template controls, metadata, visibility policy, initial roles, object grants, and audit events."],
  ["Acceptance", "Unsafe launch packets are held when restricted data, external collaborators, missing controls, or stale MFA create project risk."],
  ["Demo output", "decision: provision-ready | blockers: 0 | actionQueue: empty | auditDigest: deterministic"],
];

function ffmpegCandidates() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [process.env.FFMPEG_PATH, "ffmpeg.exe", "ffmpeg"].filter(Boolean);

  if (localAppData) {
    candidates.unshift(
      path.join(
        localAppData,
        "Microsoft",
        "WinGet",
        "Packages",
        "Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "ffmpeg-8.1.1-essentials_build",
        "bin",
        "ffmpeg.exe",
      ),
    );
  }

  return candidates;
}

function findFfmpeg() {
  for (const candidate of ffmpegCandidates()) {
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate;
    try {
      childProcess.execFileSync(candidate, ["-version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("FFmpeg was not found. Install it or set FFMPEG_PATH.");
}

function quoteText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

function drawText(text, x, y, size, color, weight = "") {
  const style = weight ? `:font=${weight}` : "";
  return `drawtext=text='${quoteText(text)}'${style}:x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function textBlock(text, x, y, size, color, maxChars, lineHeight) {
  return wrapText(text, maxChars).map((line, index) => drawText(line, x, y + index * lineHeight, size, color));
}

function slideFilter(frame, slideIndex, inputLabel) {
  const filters = [];
  const label = frame[0].toUpperCase();
  const body = frame[1];

  filters.push("drawbox=x=0:y=0:w=iw:h=ih:color=0d1726@1:t=fill");
  filters.push("drawbox=x=0:y=0:w=iw:h=130:color=10243a@1:t=fill");
  filters.push("drawbox=x=64:y=214:w=540:h=318:color=ffffff@0.93:t=fill");
  filters.push("drawbox=x=676:y=214:w=540:h=318:color=07101c@0.84:t=fill");
  filters.push(drawText("SCIBASE bounty demo artifact", 64, 44, 22, "d8e8f7"));
  filters.push(drawText("Project Provisioning Baseline Guard", 64, 92, 42, "ffffff"));
  filters.push(drawText("Issue #11: user and project management", 66, 150, 24, "b8cbe1"));
  filters.push(drawText(label, 96, 250, 18, "16405f"));
  filters.push(...textBlock(body, 96, 302, 23, "152036", 34, 34));
  filters.push(drawText("$ node project-provisioning-baseline-guard/test.js", 708, 254, 18, "68d391"));
  filters.push(...textBlock("tests passed: requester evidence, metadata, visibility, external grants, template controls, deterministic digest", 708, 304, 19, "e9f7ef", 40, 28));
  filters.push(drawText("Validation path", 708, 404, 18, "a8bdd1"));
  filters.push(drawText("1. Focused tests", 708, 438, 21, "ffffff"));
  filters.push(drawText("2. Demo JSON and Markdown", 708, 468, 21, "ffffff"));
  filters.push(drawText("3. Requirement map and acceptance notes", 708, 498, 21, "ffffff"));

  for (let index = 0; index < frames.length; index += 1) {
    const color = index === slideIndex ? "68d391@1" : "ffffff@0.30";
    filters.push(`drawbox=x=${64 + index * 54}:y=590:w=38:h=8:color=${color}:t=fill`);
  }

  filters.push(drawText("Committed video demo + focused tests + synthetic evidence", 64, 650, 21, "d8e8f7"));
  filters.push(drawText(`Slide ${slideIndex + 1} / ${frames.length}`, 1096, 650, 18, "b8cbe1"));

  return `${inputLabel}${filters.join(",")}[v${slideIndex}]`;
}

function renderDemo(ffmpeg, outputPath) {
  const args = ["-y"];
  const slideDuration = "2.1";

  for (let index = 0; index < frames.length; index += 1) {
    args.push("-f", "lavfi", "-t", slideDuration, "-i", "color=c=0d1726:s=1280x720:r=30");
  }

  const slideFilters = frames.map((frame, index) => slideFilter(frame, index, `[${index}:v]`));
  const concatInputs = frames.map((_, index) => `[v${index}]`).join("");
  const filterComplex = `${slideFilters.join(";")};${concatInputs}concat=n=${frames.length}:v=1:a=0[outv]`;

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  );

  childProcess.execFileSync(ffmpeg, args, { stdio: "inherit" });
}

const outputPath = path.join(__dirname, "demo.mp4");
renderDemo(findFfmpeg(), outputPath);
console.log(`Wrote ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
