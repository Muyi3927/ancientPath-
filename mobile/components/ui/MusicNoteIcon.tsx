import * as React from "react"
import Svg, { Path, Circle, SvgProps } from "react-native-svg"

export default function MusicNoteIcon(props: SvgProps) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <Circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <Path 
        d="M9 18V5l12-2v13" 
        stroke="currentColor" 
        strokeWidth={1.5} 
        fill="none"
        transform="translate(-6, 2) scale(0.8)"
      />
      <Circle 
        cx={6} 
        cy={18} 
        r={3} 
        fill="currentColor" 
        transform="translate(3, -2) scale(0.8)"
      />
      <Circle 
        cx={18} 
        cy={16} 
        r={3} 
        fill="currentColor" 
        transform="translate(-3, 0) scale(0.8)"
      />
    </Svg>
  )
}
