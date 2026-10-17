/* creator-loop studio — vanilla JS, no build step, relative URLs only. */
"use strict";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

let state = null;
let currentBrief = "";
let screenplay = null;
let jobTimer = null;

/* --------------------------------------------------------------- plumbing */
async function api(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}
const post = (path, body) =>
  api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });

function log(event) {
  const line = el("div", "", `${new Date().toLocaleTimeString("ko-KR")} · ${event.type || "event"} · ${JSON.stringify(event).slice(0, 220)}`);
  $("log").prepend(line);
}

function connectEvents() {
  const source = new EventSource("/api/events");
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data);
      log(event);
      if (event.type === "job_done" || event.type === "job_error") refreshJob(event.job);
      if (event.type === "produce_done") loadState();
    } catch (error) {
      /* keep-alive comment */
    }
  };
  source.onerror = () => {
    /* browser reconnects on its own */
  };
}

/* ------------------------------------------------------------------- tabs */
document.querySelectorAll("nav.tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav.tabs button").forEach((other) => other.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    $(`tab-${button.dataset.tab}`).classList.add("active");
  });
});
function showTab(name) {
  document.querySelector(`nav.tabs button[data-tab="${name}"]`).click();
}

/* ------------------------------------------------------------------ state */
async function loadState() {
  const payload = await api("/api/state");
  state = payload.state;
  renderDoctor(state.doctor);
  renderNiches(state.ranked_niches, state.niches);
  renderProjects(state.projects);
  renderAnalytics(state.analytics, state.analytics_summary);
  renderExistingProjects(state.projects);
}

function renderDoctor(doctor) {
  const node = $("doctor");
  node.innerHTML = "";
  const ffmpeg = doctor.ffmpeg || {};
  const tts = doctor.tts || {};
  const parts = [
    `ffmpeg ${ffmpeg.ffmpeg ? "<span class='ok'>OK</span>" : "<span class='bad'>MISSING</span>"}`,
    `libass ${ffmpeg.libass ? "<span class='ok'>OK</span>" : "<span class='bad'>NO</span>"}`,
    `TTS <b>${tts.selected || "-"}</b>`,
    `글꼴 ${doctor.fonts_dir ? "<span class='ok'>OK</span>" : "<span class='bad'>MISSING</span>"}`,
  ];
  (doctor.providers && doctor.providers.providers ? doctor.providers.providers : []).forEach((provider) => {
    parts.push(
      `${provider.provider} ${provider.available ? "<span class='ok'>OK</span>" : "--"}` +
        (provider.free_quota_units_per_day ? ` (무료 ${provider.free_quota_units_per_day}/일)` : "")
    );
  });
  parts.push(`카탈로그 ${doctor.catalog_videos}편 · 결정 ${doctor.human_decisions}건`);
  node.innerHTML = parts.join(" · ");
  if (doctor.providers && doctor.providers.free_only) {
    node.appendChild(el("div", "", "유료 키 없음 → 로컬 무료 엔진(절차적 아트 + ffmpeg + 오프라인 TTS)으로 제작합니다. 키를 넣으면 같은 샷이 자동으로 클라우드에 라우팅됩니다."));
  }
}

/* --------------------------------------------------------------- ① research */
let selectedNiche = "";

function renderNiches(ranked, niches) {
  const wrap = $("niches");
  wrap.innerHTML = "";
  ranked.forEach((row) => {
    const niche = niches.find((item) => item.id === row.niche_id) || {};
    const card = el("div", "niche" + (selectedNiche === row.niche_id ? " selected" : ""));
    const head = el("div", "head");
    head.appendChild(el("span", "", `${niche.name || row.niche_id}`));
    head.appendChild(el("span", "score", `${row.score.toFixed(2)} / 5`));
    card.appendChild(head);
    card.appendChild(el("div", "why", niche.why || ""));
    card.appendChild(el("div", "why", `대상: ${niche.audience || "-"} · 수익화: ${(niche.monetization_notes || "").slice(0, 90)}`));
    if (!row.personal_advantage_supplied) {
      card.appendChild(el("div", "why", "⚠ personal_advantage 미입력 상태의 참고 점수입니다. 아래 1~5점 입력에 반영됩니다."));
    }
    card.addEventListener("click", () => {
      selectedNiche = row.niche_id;
      renderNiches(ranked, niches);
      loadQuestions(row.niche_id, niche);
    });
    wrap.appendChild(card);
  });
  if (!selectedNiche && ranked.length) {
    selectedNiche = ranked[0].niche_id;
    renderNiches(ranked, niches);
    loadQuestions(selectedNiche, niches.find((item) => item.id === selectedNiche) || {});
  }
}

async function loadQuestions(nicheId, niche) {
  const wrap = $("questions");
  wrap.innerHTML = "";
  try {
    const payload = await api(`/api/questions?niche=${encodeURIComponent(nicheId)}`);
    payload.questions.forEach((question, index) => {
      const label = el("label", "", `${index + 1}. ${question}`);
      const input = el("textarea");
      input.rows = 2;
      input.dataset.question = question;
      label.appendChild(input);
      wrap.appendChild(label);
    });
  } catch (error) {
    wrap.appendChild(el("div", "result err", String(error)));
  }
  const seed = (niche.seed_topics || []).slice(0, 6);
  if (seed.length) {
    const box = el("div", "result", "씨앗 주제 (참고용, 그대로 쓰지 마세요):\n· " + seed.join("\n· "));
    wrap.appendChild(box);
  }
}

function valueAddRow(kind, evidence) {
  const row = el("div", "row");
  const kindLabel = el("label", "", "종류");
  const select = el("select");
  ["personal_experience", "original_data", "expert_commentary", "experiment", "field_recording", "unique_access"].forEach((value) => {
    const option = el("option", "", value);
    option.value = value;
    if (value === kind) option.selected = true;
    select.appendChild(option);
  });
  kindLabel.appendChild(select);
  const evidenceLabel = el("label", "", "근거 (본인 자료·경험을 구체적으로)");
  const input = el("input");
  input.value = evidence || "";
  input.placeholder = "예: 2025년 1기 확정신고 매입세액 32만원 중 18만원만 공제받았습니다.";
  evidenceLabel.appendChild(input);
  row.appendChild(kindLabel);
  row.appendChild(evidenceLabel);
  row.dataset.valueAdd = "1";
  return row;
}

$("add-value-add").addEventListener("click", () => $("value-adds").appendChild(valueAddRow("personal_experience", "")));
$("value-adds").appendChild(valueAddRow("personal_experience", ""));
$("value-adds").appendChild(valueAddRow("original_data", ""));

$("create-brief").addEventListener("click", async () => {
  const answers = {};
  document.querySelectorAll("#questions textarea").forEach((area) => {
    if (area.value.trim()) answers[area.dataset.question] = area.value.trim();
  });
  const valueAdds = [];
  document.querySelectorAll("#value-adds [data-value-add]").forEach((row) => {
    const kind = row.querySelector("select").value;
    const evidence = row.querySelector("input").value.trim();
    if (evidence) valueAdds.push({ kind, evidence });
  });
  const body = {
    niche_id: selectedNiche,
    title: $("brief-title").value.trim(),
    answers,
    value_adds: valueAdds,
    keywords: $("brief-keywords").value.split(",").map((item) => item.trim()).filter(Boolean),
    sources: $("brief-sources").value.split("\n").map((item) => item.trim()).filter(Boolean),
    personal_advantage: Number($("brief-advantage").value) || null,
    video_format: $("brief-format").value,
    runtime_target_s: Number($("brief-runtime").value) || 240,
  };
  if (!body.title) {
    $("brief-result").textContent = "작업 제목을 입력하세요.";
    $("brief-result").className = "result err";
    return;
  }
  $("brief-result").textContent = "생성 중…";
  $("brief-result").className = "result";
  try {
    const payload = await post("/api/brief", body);
    currentBrief = payload.brief_id;
    $("brief-result").className = "result ok";
    $("brief-result").textContent =
      `브리프 생성 완료: ${currentBrief}\n사람 결정 ${Object.keys(answers).length + 2}건 · value-add ${valueAdds.length}건이 결정 로그에 기록되었습니다.\n② 대본 탭으로 이동합니다.`;
    await loadState();
    showTab("script");
  } catch (error) {
    $("brief-result").className = "result err";
    $("brief-result").textContent = String(error);
  }
});

/* ---------------------------------------------------------------- ② script */
function renderProjects(projects) {
  const select = $("script-brief");
  const previous = select.value;
  select.innerHTML = "";
  projects.forEach((project) => {
    const brief = project.brief || {};
    const option = el("option", "", `${brief.working_title || project.brief_id} (${project.brief_id})`);
    option.value = project.brief_id;
    select.appendChild(option);
  });
  if (previous) select.value = previous;
  else if (currentBrief) select.value = currentBrief;
  currentBrief = select.value || currentBrief;
}

function scriptOptions() {
  return {
    brief_id: $("script-brief").value || currentBrief,
    variation_index: Number($("variation").value),
    aspect: $("aspect").value,
    resolution: $("resolution").value,
    runtime_target_s: Number($("runtime").value) || 240,
    tts: $("tts").value,
    article: $("article").value.trim(),
    budget_usd: Number($("budget").value) || 0,
    allow_paid: $("allow-paid").checked,
    native_audio: $("native-audio").checked,
    media_dir: $("media-dir").value.trim(),
    fps: Number($("fps").value) || 30,
  };
}

$("draft-script").addEventListener("click", async () => {
  $("script-meta").textContent = "초안 생성 중…";
  try {
    const payload = await post("/api/script", scriptOptions());
    screenplay = payload.screenplay;
    currentBrief = payload.brief_id;
    renderScript(payload);
  } catch (error) {
    $("script-meta").className = "result err";
    $("script-meta").textContent = String(error);
  }
});

$("save-edits").addEventListener("click", async () => {
  const edits = {};
  document.querySelectorAll("#scenes textarea[data-scene]").forEach((area) => {
    if (area.value.trim() && area.value.trim() !== area.dataset.original) edits[area.dataset.scene] = area.value.trim();
  });
  if (!Object.keys(edits).length) {
    $("script-meta").className = "result err";
    $("script-meta").textContent = "편집된 씬이 없습니다. 훅·근거·결론 씬을 직접 다시 써보세요 (이 편집이 게이트 통과 조건입니다).";
    return;
  }
  try {
    const payload = await post("/api/script", { ...scriptOptions(), edits, by: "human" });
    screenplay = payload.screenplay;
    renderScript(payload);
    $("script-meta").className = "result ok";
    $("script-meta").textContent = `사람 편집 ${Object.keys(edits).length}건 기록됨 · edit_distance ${(payload.screenplay.human_edit_distance * 100).toFixed(1)}% · human_edited=${payload.screenplay.human_edited}`;
  } catch (error) {
    $("script-meta").className = "result err";
    $("script-meta").textContent = String(error);
  }
});

function renderScript(payload) {
  const summary = payload.screenplay;
  $("script-meta").className = "result";
  $("script-meta").textContent =
    `hook=${summary.hook_archetype} · beat_plan=${summary.beat_plan} · 씬 ${summary.scenes.length}개 · 샷 ${summary.scenes.reduce((total, scene) => total + scene.shots.length, 0)}개 · 예상 ${summary.estimated_runtime_s.toFixed(0)}초\n` +
    `사람 작성 문장 비율 ${(summary.human_sourced_ratio * 100).toFixed(0)}% · 사람 편집 ${summary.human_edited ? "있음" : "없음"} (${(summary.human_edit_distance * 100).toFixed(1)}%) · variation lineage ${summary.variation_lineage.join(" → ")}`;
  const gates = $("gates");
  gates.innerHTML = "";
  if (payload.gates.passed) {
    gates.appendChild(el("div", "pass", "✓ 게이트 통과 — ② 제작 탭에서 렌더할 수 있습니다."));
  } else {
    gates.appendChild(el("div", "fail", "✗ 게이트 미통과 (제작이 차단됩니다)"));
    const list = el("ul");
    payload.gates.reasons.forEach((reason) => list.appendChild(el("li", "", reason)));
    gates.appendChild(list);
  }
  const wrap = $("scenes");
  wrap.innerHTML = "";
  summary.scenes.forEach((scene) => {
    const card = el("div", "scene");
    const meta = el("div", "meta");
    meta.appendChild(el("span", "badge", scene.id));
    meta.appendChild(el("span", "badge", scene.beat));
    meta.appendChild(el("span", `badge ${scene.origin}`, `origin: ${scene.origin}`));
    meta.appendChild(el("span", "badge", `${scene.shots.length} shots`));
    meta.appendChild(el("span", "badge", `${scene.duration_s.toFixed(1)}s`));
    card.appendChild(meta);
    card.appendChild(el("div", "meta", scene.purpose || ""));
    const area = el("textarea");
    area.value = scene.narration;
    area.dataset.scene = scene.id;
    area.dataset.original = scene.narration;
    area.addEventListener("input", () => {
      area.dataset.dirty = area.value.trim() !== area.dataset.original ? "1" : "";
    });
    card.appendChild(area);
    const shots = scene.shots
      .map((shot) => `${shot.id} [${shot.size}/${shot.move}/${shot.angle}] ${shot.duration_s.toFixed(1)}s — ${shot.prompt.slice(0, 68)}`)
      .join("\n");
    card.appendChild(el("div", "shots", shots));
    wrap.appendChild(card);
  });
}

function renderExistingProjects(projects) {
  const latest = projects.find((project) => project.screenplay_summary) || projects[0];
  if (!latest) return;
  if (latest.screenplay_summary) {
    const summary = latest.screenplay_summary;
    $("script-meta").textContent =
      `최근 프로젝트 ${summary.id}: hook=${summary.hook_archetype} · 씬 ${summary.scenes}개 · 사람 문장 ${(summary.human_sourced_ratio * 100).toFixed(0)}%`;
  }
}

/* --------------------------------------------------------------- ② produce */
async function startProduce(force) {
  const body = { ...scriptOptions(), force: !!force };
  $("produce-status").className = "result";
  $("produce-status").textContent = "렌더 시작… (무료 로컬 엔진은 샷 수 × 약 1~2초)";
  const payload = await post("/api/produce", body);
  pollJob(payload.job);
}
$("produce").addEventListener("click", () => startProduce(false).catch((error) => ($("produce-status").textContent = String(error))));
$("produce-force").addEventListener("click", () => {
  if (!window.confirm("게이트를 무시하면 정책 리포트가 차단 소견을 남깁니다. 계속할까요?")) return;
  startProduce(true).catch((error) => ($("produce-status").textContent = String(error)));
});

function pollJob(jobId) {
  if (jobTimer) clearInterval(jobTimer);
  jobTimer = setInterval(() => refreshJob(jobId), 1500);
}

async function refreshJob(jobId) {
  try {
    const payload = await post("/api/job", { job: jobId });
    const job = payload.job || {};
    if (job.status === "running") {
      $("produce-status").className = "result";
      const elapsed = Math.max(0, Math.round(Date.now() / 1000 - (job.started_at || Date.now() / 1000)));
      $("produce-status").textContent = `렌더 진행 중… ${elapsed}초 경과 (이벤트 로그 탭에서 단계별 진행 확인)`;
      return;
    }
    clearInterval(jobTimer);
    jobTimer = null;
    if (job.status === "error") {
      $("produce-status").className = "result err";
      $("produce-status").textContent = `오류: ${job.error}\n${job.trace || ""}`;
      return;
    }
    renderProduceResult(job.result || {});
    await loadState();
  } catch (error) {
    $("produce-status").className = "result err";
    $("produce-status").textContent = String(error);
  }
}

function renderProduceResult(result) {
  if (result.blocked) {
    $("produce-status").className = "result err";
    $("produce-status").textContent = "게이트 차단:\n" + (result.gates.reasons || []).join("\n");
    return;
  }
  $("produce-status").className = "result ok";
  const video = result.video || {};
  $("produce-status").textContent =
    `영상 생성 완료: ${video.path}\n길이 ${Number(video.duration_s || 0).toFixed(1)}초 · ${video.width}x${video.height} · provider=${video.provider} · 비용 $${video.cost_usd}\n자막: ${video.subtitles_path}`;
  if (result.media) {
    const player = $("player");
    player.src = result.media.video;
    player.poster = result.media.poster;
    player.load();
    const frames = $("frames");
    frames.innerHTML = "";
    (result.media.frames || []).forEach((frame) => {
      const image = el("img");
      image.src = frame;
      frames.appendChild(image);
    });
  }
  const warnings = $("produce-warnings");
  warnings.innerHTML = "";
  (result.warnings || []).slice(0, 12).forEach((warning) => warnings.appendChild(el("div", "result", `! ${warning}`)));
  const highlights = $("highlights");
  highlights.innerHTML = "";
  (result.highlights || []).forEach((item) => highlights.appendChild(el("div", "result", `쇼트용 하이라이트 (${item.reason || ""}): “${item.text}” ${item.start_s}-${item.end_s}s`)));
  renderPackage(result.package || {});
  renderPolicy(result.policy || {}, result.policy_summary || "");
  showTab("produce");
}

/* --------------------------------------------------------------- ③ package */
function renderPackage(pkg) {
  if (!pkg || !pkg.titles) return;
  const titles = $("titles");
  titles.innerHTML = "";
  pkg.titles.forEach((item) => {
    const row = el("div", "title-row");
    row.appendChild(el("div", "s", item.score.toFixed(1)));
    const body = el("div", "t");
    body.appendChild(el("div", "", item.title));
    body.appendChild(el("div", "why", `${item.archetype} · ${item.rationale || ""}`));
    row.appendChild(body);
    const use = el("button", "small ghost", "선택");
    use.addEventListener("click", () => {
      pkg.best_title = item.title;
      renderPackage(pkg);
    });
    row.appendChild(use);
    titles.appendChild(row);
  });
  const thumbs = $("thumbnails");
  thumbs.innerHTML = "";
  (pkg.thumbnails || []).forEach((item) => {
    const card = el("div", "thumb");
    const image = el("img");
    image.src = `/media/${currentBrief}/thumbnails/${item.path.split("/").pop()}`;
    image.alt = item.variant_id;
    card.appendChild(image);
    card.appendChild(
      el(
        "div",
        "cap",
        `${item.variant_id} · ${item.headline} · score ${item.score.toFixed(1)} · 모바일 가독성 ${item.legible_at_mobile ? "OK" : "개선 필요"} · ${Math.round(item.bytes / 1024)}KB`
      )
    );
    thumbs.appendChild(card);
  });
  $("description").textContent = pkg.description || "";
  $("ab-plan").textContent = `A/B 플랜: ${pkg.ab_plan || "-"}\n고정 댓글: ${pkg.pinned_comment || "-"}\n공개 문구: ${pkg.disclosure_text || "-"}`;
  fetch(`/media/${currentBrief}/upload.json`)
    .then((response) => (response.ok ? response.text() : "(업로드 번들 없음 — loop run 또는 제작 후 생성)"))
    .then((text) => ($("upload-bundle").textContent = text));
}

$("approve").addEventListener("click", async () => {
  try {
    const payload = await post("/api/approve", { brief_id: currentBrief, note: "studio 승인", by: "human" });
    $("ab-plan").textContent += `\n\n최종 승인 기록: ${payload.decision.decided_at}`;
  } catch (error) {
    $("ab-plan").textContent = String(error);
  }
});

/* ----------------------------------------------------------------- policy */
$("run-policy").addEventListener("click", async () => {
  try {
    const payload = await post("/api/policy", { brief_id: $("script-brief").value || currentBrief });
    renderPolicy(payload.policy, payload.summary);
  } catch (error) {
    $("policy-findings").textContent = String(error);
  }
});

function renderPolicy(policy, summary) {
  if (!policy || policy.score === undefined) return;
  const score = $("policy-score");
  score.className = `score ${policy.ok ? "pass" : "block"}`;
  score.innerHTML = `<span class="num">${policy.score}</span> / 100 · ${policy.ok ? "PASS (업로드 가능)" : "BLOCKED (fail-closed)"}`;
  if (summary) score.appendChild(el("div", "", summary.split("\n").slice(0, 4).join(" · ")));
  const wrap = $("policy-findings");
  wrap.innerHTML = "";
  (policy.findings || []).forEach((finding) => {
    const card = el("div", `finding ${finding.severity}`);
    card.appendChild(el("div", "code", `${finding.severity.toUpperCase()} · ${finding.code}`));
    card.appendChild(el("div", "", finding.message));
    if (finding.evidence) card.appendChild(el("div", "code", evidenceLine(finding.evidence)));
    if (finding.remediation) card.appendChild(el("div", "fix", `→ ${finding.remediation}`));
    wrap.appendChild(card);
  });
}
const evidenceLine = (evidence) => (typeof evidence === "string" ? evidence : JSON.stringify(evidence));

/* --------------------------------------------------------------- ④ analytics */
async function runAnalytics(body, csvText) {
  $("analytics-summary").textContent = "분석 중…";
  const response = await fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": csvText ? "text/csv; charset=utf-8" : "application/json" },
    body: csvText || JSON.stringify(body || {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  $("analytics-summary").textContent = payload.summary || "";
  renderAnalytics(payload.report, payload.summary);
  await loadState();
}

$("analyze-text").addEventListener("click", () => {
  const text = $("csv-text").value.trim();
  if (!text) {
    $("analytics-summary").textContent = "CSV를 붙여넣으세요.";
    return;
  }
  runAnalytics({}, text).catch((error) => ($("analytics-summary").textContent = String(error)));
});

$("csv-file").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => runAnalytics({}, String(reader.result)).catch((error) => ($("analytics-summary").textContent = String(error)));
  reader.readAsText(file);
});

$("analyze-latest").addEventListener("click", () =>
  runAnalytics({ window_days: 3650 }).catch((error) => ($("analytics-summary").textContent = String(error)))
);

function renderAnalytics(report, summary) {
  if (!report) return;
  if (summary) $("analytics-summary").textContent = summary;
  const recs = $("recommendations");
  recs.innerHTML = "";
  (report.recommendations || []).forEach((item) => {
    const card = el("div", "rec");
    const head = el("div", "head");
    head.appendChild(el("span", "", `#${item.rank} [${item.niche_id}] ${item.working_title}`));
    head.appendChild(el("span", "ev", `EV≈${item.expected_value} · ${item.confidence}`));
    card.appendChild(head);
    card.appendChild(el("div", "why", `앵글: ${item.angle}`));
    card.appendChild(el("div", "why", `근거: ${(item.rationale || []).join(" | ")}`));
    card.appendChild(el("div", "why", `필수 고유 기여: ${(item.required_value_add || []).join(", ")}`));
    if ((item.risks || []).length) card.appendChild(el("div", "risk", `리스크: ${item.risks[0]}`));
    const use = el("button", "small ghost", "① 브리프에 이 주제 사용");
    use.addEventListener("click", () => {
      $("brief-title").value = item.working_title;
      selectedNiche = item.niche_id;
      if (state) renderNiches(state.ranked_niches, state.niches);
      showTab("research");
    });
    card.appendChild(use);
    recs.appendChild(card);
  });
  const cohorts = $("cohorts");
  cohorts.innerHTML = "";
  if ((report.cohorts || []).length) {
    const table = el("table");
    table.innerHTML = "<tr><th>구분</th><th>키</th><th class='num'>편수</th><th class='num'>중앙 CTR</th><th class='num'>평균 시청비율</th><th>신뢰</th></tr>";
    report.cohorts.forEach((row) => {
      const tr = el("tr");
      tr.innerHTML = `<td>${row.dimension}</td><td>${row.key}</td><td class='num'>${row.videos}</td><td class='num'>${(row.median_ctr * 100).toFixed(2)}%</td><td class='num'>${(row.median_retention * 100).toFixed(0)}%</td><td>${row.reliable ? "예" : "표본 부족"}</td>`;
      table.appendChild(tr);
    });
    cohorts.appendChild(table);
  } else {
    cohorts.appendChild(el("div", "result", "코호트 데이터가 없습니다. Studio CSV를 가져오세요."));
  }
  (report.guards || []).forEach((guard) => cohorts.appendChild(el("div", "result", `! ${guard}`)));
}

/* ------------------------------------------------------------------- boot */
(async function boot() {
  try {
    await loadState();
    connectEvents();
    const projects = (state && state.projects) || [];
    const withVideo = projects.find((project) => project.video);
    if (withVideo) {
      currentBrief = withVideo.brief.brief_id || withVideo.brief.id;
      $("player").src = `/media/${currentBrief}/video.mp4`;
      $("player").poster = `/media/${currentBrief}/poster.png`;
      if (withVideo.package) renderPackage(withVideo.package);
      if (withVideo.policy) renderPolicy(withVideo.policy, withVideo.policy.summary || "");
    }
  } catch (error) {
    $("doctor").textContent = `상태 로드 실패: ${error}`;
  }
})();
