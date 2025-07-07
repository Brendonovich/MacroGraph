import { JSONEnum } from "@macrograph/json";
import { t } from "@macrograph/typesystem";
import type { Pkg } from ".";

export function createTypes(pkg: Pkg) {
	const BoundsType = pkg.createEnum("Bounds Type", (e) => [
		e.variant("OBS_BOUNDS_MAX_ONLY"),
		e.variant("OBS_BOUNDS_NONE"),
		e.variant("OBS_BOUNDS_SCALE_INNER"),
		e.variant("OBS_BOUNDS_SCALE_OUTER"),
		e.variant("OBS_BOUNDS_SCALE_TO_HEIGHT"),
		e.variant("OBS_BOUNDS_SCALE_TO_WIDTH"),
		e.variant("OBS_BOUNDS_STRETCH"),
	]);

	const Alignment = pkg.createEnum("Alignment", (e) => [
		e.variant("Center"),
		e.variant("Bottom Center"),
		e.variant("Bottom Left"),
		e.variant("Bottom Right"),
		e.variant("Center Left"),
		e.variant("Center Right"),
		e.variant("Top Center"),
		e.variant("Top Left"),
		e.variant("Top Right"),
	]);

	const SceneItemTransform = pkg.createStruct("Scene Item Transform", (s) => ({
		alignment: s.field("Alignment", t.enum(Alignment)),
		boundsAlignment: s.field("Bounds Alignment", t.enum(Alignment)),
		boundsHeight: s.field("Bounds Height", t.float()),
		boundsType: s.field("Bounds Type", t.enum(BoundsType)),
		boundsWidth: s.field("Bounds Width", t.float()),
		cropBottom: s.field("Crop Bottom", t.float()),
		cropLeft: s.field("Crop Left", t.float()),
		cropRight: s.field("Crop Right", t.float()),
		cropTop: s.field("Crop Top", t.float()),
		positionX: s.field("Position X", t.float()),
		positionY: s.field("Position Y", t.float()),
		rotation: s.field("Rotation", t.float()),
		scaleX: s.field("Scale X", t.float()),
		scaleY: s.field("Scale Y", t.float()),
		sourceWidth: s.field("Source Width", t.float()),
		sourceHeight: s.field("Source Height", t.float()),
		width: s.field("Width", t.float()),
		height: s.field("Height", t.float()),
	}));

	const SceneItemTransformImport = pkg.createStruct(
		"Scene Item Transform",
		(s) => ({
			alignment: s.field("Alignment", t.option(t.enum(Alignment))),
			boundsAlignment: s.field("Bounds Alignment", t.option(t.enum(Alignment))),
			boundsHeight: s.field("Bounds Height", t.option(t.float())),
			boundsType: s.field("Bounds Type", t.option(t.enum(BoundsType))),
			boundsWidth: s.field("Bounds Width", t.option(t.float())),
			cropBottom: s.field("Crop Bottom", t.option(t.float())),
			cropLeft: s.field("Crop Left", t.option(t.float())),
			cropRight: s.field("Crop Right", t.option(t.float())),
			cropTop: s.field("Crop Top", t.option(t.float())),
			positionX: s.field("Position X", t.option(t.float())),
			positionY: s.field("Position Y", t.option(t.float())),
			rotation: s.field("Rotation", t.option(t.float())),
			scaleX: s.field("Scale X", t.option(t.float())),
			scaleY: s.field("Scale Y", t.option(t.float())),
			sourceWidth: s.field("Source Width", t.option(t.float())),
			sourceHeight: s.field("Source Height", t.option(t.float())),
			width: s.field("Width", t.option(t.float())),
			height: s.field("Height", t.option(t.float())),
		}),
	);

	const Scenes = pkg.createStruct("Scenes", (s) => ({
		sceneName: s.field("Scene name", t.string()),
		sceneIndex: s.field("Scene Index", t.int()),
	}));

	const AudioTracks = pkg.createStruct("Audio Tracks", (s) => ({
		"1": s.field("1", t.bool()),
		"2": s.field("2", t.bool()),
		"3": s.field("3", t.bool()),
		"4": s.field("4", t.bool()),
		"5": s.field("5", t.bool()),
		"6": s.field("6", t.bool()),
	}));

	const MonitorType = pkg.createEnum("Monitor Type", (e) => [
		e.variant("None"),
		e.variant("Monitor Only"),
		e.variant("Monitor and Output"),
	]);

	const InputVolumeMeter = pkg.createStruct("Input Volume Meter", (s) => ({
		inputName: s.field("Input Name", t.string()),
		inputLevelsMul: s.field("Input Levels (mul)", t.list(t.list(t.float()))),
	}));

	//missing availableRequests & supportedImageForamts Array<string>

	const SceneItem = pkg.createStruct("Scene Item", (s) => ({
		sceneItemId: s.field("ID", t.int()),
		inputKind: s.field("Input Kind", t.option(t.string())),
		isGroup: s.field("Is Group", t.bool()),
		sceneItemBlendMode: s.field("Blend Mode", t.string()),
		sceneItemEnabled: s.field("Enabled", t.bool()),
		sceneItemIndex: s.field("Index", t.int()),
		sceneItemLocked: s.field("Locked", t.bool()),
		sceneItemTransform: s.field("Transform", t.struct(SceneItemTransform)),
		sourceName: s.field("Source Name", t.string()),
		sourceType: s.field("Source Type", t.string()),
	}));

	const Filter = pkg.createStruct("Filter", (s) => ({
		filterEnabled: s.field("Enabled", t.bool()),
		filterIndex: s.field("Index", t.int()),
		filterKind: s.field("Kind", t.string()),
		filterName: s.field("Name", t.string()),
		filterSettings: s.field("Settings", t.enum(JSONEnum)),
	}));

	const Transition = pkg.createStruct("Transition", (s) => ({
		transitionConfigurable: s.field("Configurable", t.bool()),
		transitionFixed: s.field("Fixed", t.bool()),
		transitionKind: s.field("Kind", t.string()),
		transitionName: s.field("Name", t.string()),
	}));

	const PropertyItem = pkg.createStruct("Property Item", (s) => ({
		itemEnabled: s.field("Enabled", t.bool()),
		itemName: s.field("Name", t.string()),
		itemValue: s.field("Value", t.string()),
	}));

	const Scene = pkg.createStruct("Scenes", (s) => ({
		sceneName: s.field("Name", t.string()),
		sceneIndex: s.field("Index", t.int()),
	}));

	const InputInfo = pkg.createStruct("Input Info", (s) => ({
		inputName: s.field("Input name", t.string()),
		inputKind: s.field("Input Kind", t.string()),
		unversionedInputKind: s.field("Unversioned Input Kind", t.string()),
	}));

	return {
		BoundsType,
		Alignment,
		SceneItemTransform,
		SceneItemTransformImport,
		Scenes,
		AudioTracks,
		MonitorType,
		InputVolumeMeter,
		SceneItem,
		Filter,
		Transition,
		PropertyItem,
		Scene,
		InputInfo,
	};
}

export type Types = ReturnType<typeof createTypes>;
