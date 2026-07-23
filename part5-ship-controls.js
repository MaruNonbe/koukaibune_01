// ============================================================
// Part5: 小鵜飼船AR操作ロジック
//   ・1本指ドラッグ  → 船を左右／前後に移動
//   ・2本指ピンチ    → 船を拡大／縮小
//   ・十字キーボタン → 押している間、前進／後退／旋回
//   ・高さボタン     → 船の上下（Y）位置を調整
//   ・拡大／縮小ボタン → ピンチと同じ拡縮をボタンでも操作
//   ・STOPボタン     → 初期位置・角度・大きさにリセット
//   ・汽笛ボタン     → 音を合成して再生（音声ファイル不要）
//   ・撮影ボタン     → 画面をキャプチャして画像として保存
//   ・GPS ON/OFF     → 表示切り替えのみ（実際のGPS連動は未実装）
// ============================================================

(function () {
  "use strict";

  // ---- 初期値（元のa-entity #shipの属性と合わせています） ----
  const DEFAULT_STATE = {
    x: 0,
    y: -0.5,
    z: -15,
    rotY: 180,
    scale: 5,
  };

  // 現在の状態（この値を書き換えて、都度a-entityに反映します）
  const state = Object.assign({}, DEFAULT_STATE);

  // 移動・回転・拡縮の速さ（値を変えると感度を調整できます）
  const SETTINGS = {
    dragMoveSpeed: 0.02,     // 1本指ドラッグ：画面1pxあたりの移動量
    pinchScaleSpeed: 0.01,   // ピンチ：指の距離1pxあたりの拡縮量
    buttonMoveStep: 0.3,     // 十字キー：1フレームあたりの移動量
    buttonTurnStep: 2,       // 十字キー：1フレームあたりの回転角度（度）
    buttonHeightStep: 0.05,  // 高さボタン：1フレームあたりの移動量
    buttonZoomStep: 0.05,    // 拡大縮小ボタン：1フレームあたりの拡縮量
    minScale: 0.5,
    maxScale: 20,
    buttonRepeatMs: 40,      // ボタンを押し続けたときの更新間隔
  };

  let shipEl = null;

  function applyTransform() {
    if (!shipEl) return;
    shipEl.setAttribute("position", `${state.x} ${state.y} ${state.z}`);
    shipEl.setAttribute("rotation", `0 ${state.rotY} 0`);
    shipEl.setAttribute("scale", `${state.scale} ${state.scale} ${state.scale}`);
  }

  function clampScale(v) {
    return Math.min(SETTINGS.maxScale, Math.max(SETTINGS.minScale, v));
  }

  function updateDebugInfo(text) {
    const debug = document.getElementById("debug-info");
    if (debug) debug.textContent = text;
  }

  // ------------------------------------------------------------
  // 1本指ドラッグ・2本指ピンチ（タッチ操作）
  // ------------------------------------------------------------
  function setupTouchControls() {
    const sceneEl = document.querySelector("a-scene");
    if (!sceneEl) return;

    let lastTouches = null; // 直前のタッチ位置を保持

    function getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    sceneEl.addEventListener(
      "touchstart",
      (e) => {
        lastTouches = Array.from(e.touches).map((t) => ({
          x: t.clientX,
          y: t.clientY,
        }));
        if (e.touches.length === 2) {
          lastTouches.distance = getTouchDistance(e.touches);
        }
      },
      { passive: true }
    );

    sceneEl.addEventListener(
      "touchmove",
      (e) => {
        if (!lastTouches) return;

        if (e.touches.length === 1) {
          // ---- 1本指：左右・前後に移動 ----
          const dx = e.touches[0].clientX - lastTouches[0].x;
          const dy = e.touches[0].clientY - lastTouches[0].y;

          state.x += dx * SETTINGS.dragMoveSpeed;
          state.z += dy * SETTINGS.dragMoveSpeed; // 上下ドラッグ→奥行き（前後）

          applyTransform();

          lastTouches = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
        } else if (e.touches.length === 2) {
          // ---- 2本指：ピンチで拡大縮小 ----
          const newDistance = getTouchDistance(e.touches);
          if (lastTouches.distance) {
            const delta = newDistance - lastTouches.distance;
            state.scale = clampScale(state.scale + delta * SETTINGS.pinchScaleSpeed);
            applyTransform();
          }
          lastTouches = Array.from(e.touches).map((t) => ({
            x: t.clientX,
            y: t.clientY,
          }));
          lastTouches.distance = newDistance;
        }

        e.preventDefault();
      },
      { passive: false }
    );

    sceneEl.addEventListener(
      "touchend",
      () => {
        lastTouches = null;
      },
      { passive: true }
    );
  }

  // ------------------------------------------------------------
  // 十字キー・各種ボタン（押している間、繰り返し動作）
  // ------------------------------------------------------------
  function bindHold(id, onTick) {
    const el = document.getElementById(id);
    if (!el) return;
    let intervalId = null;

    const start = (e) => {
      e.preventDefault();
      if (intervalId) return;
      onTick(); // 押した瞬間に1回反映
      intervalId = setInterval(onTick, SETTINGS.buttonRepeatMs);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchend", stop);
    el.addEventListener("touchcancel", stop);
    el.addEventListener("mousedown", start);
    el.addEventListener("mouseup", stop);
    el.addEventListener("mouseleave", stop);
  }

  function bindTap(id, onTap) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", onTap);
  }

  function headingRad() {
    return (state.rotY * Math.PI) / 180;
  }

  // 船モデルの船首－船尾の軸は、ワールドのX軸方向を向くように作られているため、
  // （Z軸ではなく）X軸を主軸として前後移動を計算しています。
  // ↑↓ボタンを押したときに前後ではなく逆方向（後退のつもりが前進）に動く場合は、
  // このFORWARD_SIGNを 1 → -1（またはその逆）に変更してください。
  const FORWARD_SIGN = 1;

  // 現在の向き(rotY)に沿って前後移動
  function moveAlongHeading(sign) {
    state.x += Math.cos(headingRad()) * SETTINGS.buttonMoveStep * sign * FORWARD_SIGN;
    state.z += Math.sin(headingRad()) * SETTINGS.buttonMoveStep * sign * FORWARD_SIGN;
    applyTransform();
  }

  function turn(sign) {
    state.rotY = (state.rotY + SETTINGS.buttonTurnStep * sign + 360) % 360;
    applyTransform();
  }

  function setupButtonControls() {
    // 前進・後退
    bindHold("btn-fwd", () => moveAlongHeading(1));
    bindHold("btn-back", () => moveAlongHeading(-1));

    // その場旋回
    bindHold("btn-turn-left", () => turn(-1));
    bindHold("btn-turn-right", () => turn(1));

    // カーブ移動（旋回しながら前進／後退）
    bindHold("btn-curve-left-fwd", () => { turn(-1); moveAlongHeading(1); });
    bindHold("btn-curve-right-fwd", () => { turn(1); moveAlongHeading(1); });
    bindHold("btn-curve-left-back", () => { turn(-1); moveAlongHeading(-1); });
    bindHold("btn-curve-right-back", () => { turn(1); moveAlongHeading(-1); });

    // 高さ
    bindHold("btn-height-up", () => {
      state.y += SETTINGS.buttonHeightStep;
      applyTransform();
    });
    bindHold("btn-height-down", () => {
      state.y -= SETTINGS.buttonHeightStep;
      applyTransform();
    });

    // 拡大・縮小
    bindHold("btn-zoom-in", () => {
      state.scale = clampScale(state.scale + SETTINGS.buttonZoomStep);
      applyTransform();
    });
    bindHold("btn-zoom-out", () => {
      state.scale = clampScale(state.scale - SETTINGS.buttonZoomStep);
      applyTransform();
    });

    // STOP：初期位置・角度・大きさにリセット
    bindTap("btn-stop", () => {
      Object.assign(state, DEFAULT_STATE);
      applyTransform();
    });

    // GPS ON/OFF：表示切り替えのみ（実際のGPS連動は未実装）
    let gpsOn = false;
    bindTap("btn-mode", (e) => {
      gpsOn = !gpsOn;
      e.currentTarget.textContent = gpsOn ? "GPS ON" : "GPS OFF";
      updateDebugInfo(gpsOn ? "モード: GPS連動（未実装・表示のみ）" : "モード: 自由配置（Manual）");
    });

    // 汽笛：Web Audioで音を合成して再生（音声ファイル不要）
    bindTap("btn-horn", playHorn);

    // 撮影：現在の画面をキャプチャして保存
    bindTap("btn-capture", captureScreenshot);
  }

  // ------------------------------------------------------------
  // 汽笛音（Web Audio APIでその場合成。音声ファイルは使用しません）
  // ------------------------------------------------------------
  function playHorn() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      [220, 165].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + 1.2);
      });
    } catch (err) {
      console.warn("[Part5] 汽笛の再生に失敗しました:", err);
    }
  }

  // ------------------------------------------------------------
  // 撮影（A-Frame標準のscreenshotコンポーネントを利用）
  // ------------------------------------------------------------
  function captureScreenshot() {
    const sceneEl = document.querySelector("a-scene");
    if (!sceneEl || !sceneEl.components || !sceneEl.components.screenshot) {
      console.warn("[Part5] screenshotコンポーネントが見つかりません。");
      return;
    }
    try {
      const canvas = sceneEl.components.screenshot.getCanvas("perspective");
      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = dataUrl;
      link.download = `koukaibune-ar-${stamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn("[Part5] 撮影に失敗しました:", err);
    }
  }

  // ------------------------------------------------------------
  // モデルの中心ズレを自動補正
  //   小鵜飼船モデル（GLB）の内部原点(pivot)が、モデル自体の中心と
  //   一致していない場合、a-entityのposition="0 -0.5 -15"（画面中央の
  //   はずの位置）を指定していても、見た目が左右どちらかに寄って
  //   表示されることがあります。
  //   モデル読み込み完了時に実際の形状（バウンディングボックス）を
  //   計算し、中心が正しく画面中央に来るよう自動調整します。
  // ------------------------------------------------------------

  // 自動補正だけでは微妙にズレが残る場合に、手動で追加調整するための値。
  // 右に寄っている場合はプラス、左に寄っている場合はマイナスの値にしてください。
  const MANUAL_X_OFFSET = -2;

  function setupModelRecenter() {
    if (!shipEl) return;
    shipEl.addEventListener("model-loaded", (evt) => {
      const model = evt.detail && evt.detail.model;
      if (!model || typeof THREE === "undefined") {
        console.warn("[Part5] モデルの中心補正に必要な情報が取得できませんでした。");
        return;
      }
      try {
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // 左右（X軸）のズレのみを自動補正します。
        // 前後・上下のズレも気になる場合は、下記2行のコメントを外してください。
        model.position.x -= center.x;
        model.position.x += MANUAL_X_OFFSET;
        // model.position.y -= center.y;
        // model.position.z -= center.z;
      } catch (err) {
        console.warn("[Part5] モデルの中心補正に失敗しました:", err);
      }
    });
  }

  // ------------------------------------------------------------
  // 初期化
  // ------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", () => {
    shipEl = document.getElementById("ship");
    const sceneEl = document.querySelector("a-scene");

    // 撮影機能に必要なscreenshotコンポーネントをa-sceneに付与
    if (sceneEl && !sceneEl.hasAttribute("screenshot")) {
      sceneEl.setAttribute("screenshot", "");
    }

    applyTransform();
    setupModelRecenter();
    setupTouchControls();
    setupButtonControls();
  });
})();
