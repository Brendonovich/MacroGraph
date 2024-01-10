import { ReactiveMap } from "@solid-primitives/map";
import OBS, { EventSubscription, EventTypes } from "obs-websocket-js";
import { Maybe } from "@macrograph/typesystem";
import { z } from "zod";

type InstanceState = { password: string | null } & (
  | {
      state: "disconnected" | "connecting";
    }
  | {
      state: "connected";
      obs: OBS;
    }
);

// old localstorage key
const OBS_WS = "obsWs";

const OBS_INSTANCES = "obs-instances";
const INSTANCE_SCHEMA = z.object({
  url: z.string(),
  password: z.string().optional(),
});

export function createCtx(
  emitEvent: <T extends keyof EventTypes>(data: {
    name: T;
    data: EventTypes[T];
  }) => void
) {
  const instances = new ReactiveMap<string, InstanceState>();

  async function addInstance(ip: string, password?: string) {
    await disconnectInstance(ip);

    instances.set(ip, { state: "connecting", password: password ?? null });
    persistInstances();

    await connectInstance(ip);
  }

  async function connectInstance(ip: string) {
    const maybeInstance = instances.get(ip);
    if (!maybeInstance) return;

    const instance = maybeInstance;
    function setDisconnected() {
      instances.set(ip, {
        state: "disconnected",
        password: instance.password,
      });
    }

    const obs = new OBS();

    try {
      await obs.connect(ip, instance.password ?? undefined, {
        eventSubscriptions:
          EventSubscription.All |
          EventSubscription.SceneItemTransformChanged |
          EventSubscription.InputActiveStateChanged |
          EventSubscription.InputShowStateChanged,
      });
    } catch {
      setDisconnected();
      return;
    }

    obs.on("ConnectionClosed", setDisconnected);
    obs.on("ConnectionError", setDisconnected);

    setupEventListeners(obs, emitEvent);

    instances.set(ip, { state: "connected", obs, password: instance.password });
    persistInstances();
  }

  async function disconnectInstance(ip: string) {
    const instance = instances.get(ip);
    if (!instance) return;
    if (instance.state !== "connected") return;

    instances.set(ip, { state: "disconnected", password: instance.password });
    await instance.obs.disconnect();
  }

  async function removeInstance(ip: string) {
    instances.delete(ip);
    persistInstances();
    await disconnectInstance(ip);
  }

  // convert old localstorage data to new system
  Maybe(localStorage.getItem(OBS_WS)).mapAsync(async (jstr) => {
    const { url, password } = INSTANCE_SCHEMA.parse(JSON.parse(jstr));

    try {
      await addInstance(url, password);
    } catch {
    } finally {
      localStorage.removeItem(OBS_WS);
    }
  });

  Maybe(localStorage.getItem(OBS_INSTANCES)).mapAsync(async (jstr) => {
    const instances = z.array(INSTANCE_SCHEMA).parse(JSON.parse(jstr));

    instances.forEach((i) => addInstance(i.url, i.password));
  });

  function persistInstances() {
    localStorage.setItem(
      OBS_INSTANCES,
      JSON.stringify(
        [...instances].map(([url, instance]) => ({
          url,
          password: instance.password,
        }))
      )
    );
  }

  return {
    instances,
    addInstance,
    connectInstance,
    disconnectInstance,
    removeInstance,
  };
}

export type Ctx = ReturnType<typeof createCtx>;

function setupEventListeners(
  obs: OBS,
  emitEvent: <T extends keyof EventTypes>(data: {
    name: T;
    data: EventTypes[T];
  }) => void
) {
  obs.on("CurrentSceneCollectionChanging", (data) => {
    emitEvent({ name: "CurrentSceneCollectionChanging", data });
  });
  obs.on("ExitStarted", () => {
    emitEvent({ name: "ExitStarted", data: undefined });
  });
  obs.on("CurrentSceneCollectionChanged", (data) => {
    emitEvent({ name: "CurrentSceneCollectionChanged", data });
  });
  obs.on("SceneCollectionListChanged", (data) => {
    emitEvent({ name: "SceneCollectionListChanged", data });
  });
  obs.on("CurrentProfileChanging", (data) => {
    emitEvent({ name: "CurrentProfileChanging", data });
  });
  obs.on("CurrentProfileChanged", (data) => {
    emitEvent({ name: "CurrentProfileChanged", data });
  });
  obs.on("ProfileListChanged", (data) => {
    emitEvent({ name: "ProfileListChanged", data });
  });
  obs.on("SceneCreated", (data) => {
    emitEvent({ name: "SceneCreated", data });
  });
  obs.on("SceneRemoved", (data) => {
    emitEvent({ name: "SceneRemoved", data });
  });
  obs.on("SceneNameChanged", (data) => {
    emitEvent({ name: "SceneNameChanged", data });
  });
  obs.on("CurrentProgramSceneChanged", (data) => {
    emitEvent({ name: "CurrentProgramSceneChanged", data });
  });
  obs.on("CurrentPreviewSceneChanged", (data) => {
    emitEvent({ name: "CurrentPreviewSceneChanged", data });
  });
  obs.on("SceneListChanged", (data) => {
    emitEvent({ name: "SceneListChanged", data });
  });
  obs.on("InputCreated", (data) => {
    emitEvent({ name: "InputCreated", data });
  });
  obs.on("InputRemoved", (data) => {
    emitEvent({ name: "InputRemoved", data });
  });
  obs.on("InputNameChanged", (data) => {
    emitEvent({ name: "InputNameChanged", data });
  });
  obs.on("InputActiveStateChanged", (data) => {
    emitEvent({ name: "InputActiveStateChanged", data });
  });
  obs.on("InputShowStateChanged", (data) => {
    emitEvent({ name: "InputShowStateChanged", data });
  });
  obs.on("InputMuteStateChanged", (data) => {
    emitEvent({ name: "InputMuteStateChanged", data });
  });
  obs.on("InputVolumeChanged", (data) => {
    emitEvent({ name: "InputVolumeChanged", data });
  });
  obs.on("InputAudioBalanceChanged", (data) => {
    emitEvent({ name: "InputAudioBalanceChanged", data });
  });
  obs.on("InputAudioSyncOffsetChanged", (data) => {
    emitEvent({ name: "InputAudioSyncOffsetChanged", data });
  });
  obs.on("InputAudioTracksChanged", (data) => {
    emitEvent({ name: "InputAudioTracksChanged", data });
  });
  obs.on("InputAudioMonitorTypeChanged", (data) => {
    emitEvent({ name: "InputAudioMonitorTypeChanged", data });
  });
  obs.on("InputVolumeMeters", (data) => {
    emitEvent({ name: "InputVolumeMeters", data });
  });
  obs.on("CurrentSceneTransitionChanged", (data) => {
    emitEvent({ name: "CurrentSceneTransitionChanged", data });
  });
  obs.on("CurrentSceneTransitionDurationChanged", (data) => {
    emitEvent({ name: "CurrentSceneTransitionDurationChanged", data });
  });
  obs.on("SceneTransitionStarted", (data) => {
    emitEvent({ name: "SceneTransitionStarted", data });
  });
  obs.on("SceneTransitionEnded", (data) => {
    emitEvent({ name: "SceneTransitionEnded", data });
  });
  obs.on("SceneTransitionVideoEnded", (data) => {
    emitEvent({ name: "SceneTransitionVideoEnded", data });
  });
  obs.on("SourceFilterRemoved", (data) => {
    emitEvent({ name: "SourceFilterRemoved", data });
  });
  obs.on("SourceFilterNameChanged", (data) => {
    emitEvent({ name: "SourceFilterNameChanged", data });
  });
  obs.on("SourceFilterEnableStateChanged", (data) => {
    emitEvent({ name: "SourceFilterEnableStateChanged", data });
  });
  obs.on("SceneItemCreated", (data) => {
    emitEvent({ name: "SceneItemCreated", data });
  });
  obs.on("SceneItemRemoved", (data) => {
    emitEvent({ name: "SceneItemRemoved", data });
  });
  obs.on("SceneItemListReindexed", (data) => {
    emitEvent({ name: "SceneItemListReindexed", data });
  });
  obs.on("SceneItemEnableStateChanged", (data) => {
    emitEvent({ name: "SceneItemEnableStateChanged", data });
  });
  obs.on("SceneItemLockStateChanged", (data) => {
    emitEvent({ name: "SceneItemLockStateChanged", data });
  });
  obs.on("SceneItemSelected", (data) => {
    emitEvent({ name: "SceneItemSelected", data });
  });
  obs.on("SceneItemTransformChanged", (data) => {
    emitEvent({ name: "SceneItemTransformChanged", data });
  });
  obs.on("StreamStateChanged", (data) => {
    emitEvent({ name: "StreamStateChanged", data });
  });
  obs.on("RecordStateChanged", (data) => {
    emitEvent({ name: "RecordStateChanged", data });
  });
  obs.on("ReplayBufferStateChanged", (data) => {
    emitEvent({ name: "ReplayBufferStateChanged", data });
  });
  obs.on("VirtualcamStateChanged", (data) => {
    emitEvent({ name: "VirtualcamStateChanged", data });
  });
  obs.on("ReplayBufferSaved", (data) => {
    emitEvent({ name: "ReplayBufferSaved", data });
  });
  obs.on("MediaInputPlaybackStarted", (data) => {
    emitEvent({ name: "MediaInputPlaybackStarted", data });
  });
  obs.on("MediaInputPlaybackEnded", (data) => {
    emitEvent({ name: "MediaInputPlaybackEnded", data });
  });
  obs.on("MediaInputActionTriggered", (data) => {
    emitEvent({ name: "MediaInputActionTriggered", data });
  });
  obs.on("StudioModeStateChanged", (data) => {
    emitEvent({ name: "StudioModeStateChanged", data });
  });
  obs.on("ScreenshotSaved", (data) => {
    emitEvent({ name: "ScreenshotSaved", data });
  });
  obs.on("ConnectionOpened", () =>
    emitEvent({ name: "ConnectionOpened", data: undefined })
  );
}
