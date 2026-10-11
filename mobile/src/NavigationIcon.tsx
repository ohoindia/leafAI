import Svg, { Circle, Path } from "react-native-svg";

type NavigationRoute =
  "market" | "weather" | "home" | "capture" | "history" | "services" | "profile";

export function NavigationIcon({
  route,
  selected,
}: {
  route: NavigationRoute;
  selected: boolean;
}) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={selected ? "#007ca8" : "#63758a"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {route === "market" && (
        <Path d="M3 21h18M5 17v-4M10 17V9M15 17V5M20 17V3" />
      )}
      {route === "weather" && (
        <Path d="M7 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11-1 4.5 4.5 0 0 0 0 9Z" />
      )}
      {route === "home" && (
        <Path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
      )}
      {route === "capture" && (
        <>
          <Circle cx={10.5} cy={10.5} r={7.5} />
          <Path d="m16 16 5 5" />
        </>
      )}
      {route === "services" && <Path d="M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z" />}
      {route === "history" && (
        <>
          <Path d="M3 11a9 9 0 1 1 2.7 7.4M3 4v7h7M12 7v5l3 2" />
        </>
      )}
      {route === "profile" && (
        <>
          <Circle cx={12} cy={7} r={4} />
          <Path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
    </Svg>
  );
}
