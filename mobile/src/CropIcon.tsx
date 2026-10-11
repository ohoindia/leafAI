import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, View, type ImageSourcePropType } from "react-native";
import Svg, { Path } from "react-native-svg";
import { cropDetails } from "../../common/crops.js";
import { recoverCropIcon } from "./crop-icon-cache";

const bundled: Record<string, ImageSourcePropType> = {
  cotton: require("../assets/crop-icons/v1/cotton.png"),
  rice: require("../assets/crop-icons/v1/rice.png"),
  maize: require("../assets/crop-icons/v1/maize.png"),
  jowar: require("../assets/crop-icons/v1/jowar.png"),
  ragi: require("../assets/crop-icons/v1/ragi.png"),
  bajra: require("../assets/crop-icons/v1/bajra.png"),
  groundnut: require("../assets/crop-icons/v1/groundnut.png"),
  soybean: require("../assets/crop-icons/v1/soybean.png"),
  sunflower: require("../assets/crop-icons/v1/sunflower.png"),
  sesame: require("../assets/crop-icons/v1/sesame.png"),
  niger: require("../assets/crop-icons/v1/niger.png"),
  tur: require("../assets/crop-icons/v1/tur.png"),
  urad: require("../assets/crop-icons/v1/urad.png"),
  pulse: require("../assets/crop-icons/v1/pulse.png"),
  chilli: require("../assets/crop-icons/v1/chilli.png"),
  tomato: require("../assets/crop-icons/v1/tomato.png"),
  vegetable: require("../assets/crop-icons/v1/vegetable.png"),
  fruit: require("../assets/crop-icons/v1/fruit.png"),
  seed: require("../assets/crop-icons/v1/seed.png"),
  plant: require("../assets/crop-icons/v1/plant.png"),
  grain: require("../assets/crop-icons/v1/grain.png"),
};

export function CropIcon({ name, size = 56 }: { name: string; size?: number }) {
  const key = cropDetails(name).image;
  return <IconImage key={key} iconKey={key} size={size} />;
}

function IconImage({ iconKey, size }: { iconKey: string; size: number }) {
  const [source, setSource] = useState<ImageSourcePropType | null>(bundled[iconKey] || null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const attempts = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const recover = useCallback(async () => {
    if (loading || unavailable) return;
    if (attempts.current >= 2) {
      setUnavailable(true);
      return;
    }
    const refresh = attempts.current++ > 0;
    setLoading(true);
    try {
      const uri = await recoverCropIcon(iconKey, refresh);
      if (active.current) setSource({ uri });
    } catch {
      if (active.current) setUnavailable(true);
    } finally {
      if (active.current) setLoading(false);
    }
  }, [loading, unavailable, iconKey]);
  useEffect(() => {
    if (!source) void recover();
  }, [source, recover]);
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: 10, backgroundColor: "#f0f7fb", alignItems: "center", justifyContent: "center" }}>
      {unavailable ? (
        <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" accessible={false}>
          <Path d="M12 22V10M12 15C5 15 3 9 4 5C10 5 13 9 12 15M12 11C18 12 22 7 20 3C14 4 11 7 12 11" stroke="#007ca8" strokeWidth={1.5} fill="#d9edf7" />
        </Svg>
      ) : loading ? <ActivityIndicator size="small" color="#007ca8" /> : source ? (
        <Image
          source={source}
          accessible={false}
          resizeMode="contain"
          style={{ width: size - 4, height: size - 4 }}
          onError={() => void recover()}
        />
      ) : null}
    </View>
  );
}
