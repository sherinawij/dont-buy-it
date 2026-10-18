import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Face from './Face';

const EDGE = '#32764B';

function Leaf({ x, y, flip = false, scale = 1, color = '#72BE79' }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <Path d="M0 0 C-42 5 -61 -20 -59 -40 C-27 -46 -4 -27 0 0 Z" fill={color} stroke={EDGE} strokeWidth={2.5} />
      <Path d="M-47 -31 Q-23 -20 0 0" stroke={EDGE} strokeWidth={2} fill="none" opacity={0.65} />
    </G>
  );
}

function Flower({ x, y, scale = 1 }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      {[0, 72, 144, 216, 288].map((angle) => <Ellipse key={angle} cx={0} cy={-12} rx={10} ry={14} fill="#F5B8C4" stroke="#C8758D" strokeWidth={1.5} transform={`rotate(${angle})`} />)}
      <Circle r={9} fill="#F7D575" stroke="#B88A35" strokeWidth={1.5} />
    </G>
  );
}

function Sparkle({ x, y, scale = 1 }) {
  return <Path d="M0 -10 Q1 -1 9 0 Q1 1 0 10 Q-1 1 -9 0 Q-1 -1 0 -10 Z" fill="#EDBC4D" transform={`translate(${x} ${y}) scale(${scale})`} />;
}

// Solid fills and fixed coordinates keep share-card captures repeatable.
export default function SproutArt({ stage, mood, size, hidePupils = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 260" accessible={false}>
      <Ellipse cx={120} cy={243} rx={61} ry={8} fill="#203D2C" opacity={0.08} />
      {stage === 0 ? (
        <G>
          <Path d="M120 87 C170 106 179 145 166 180 C156 205 91 213 74 179 C57 144 76 109 120 87 Z" fill="#C6A77B" stroke="#806247" strokeWidth={3} />
          <Path d="M119 91 Q99 110 103 121 M99 183 Q106 196 118 200" fill="none" stroke="#E8D2B1" strokeWidth={5} strokeLinecap="round" />
          <Path d="M93 234 Q120 225 148 234" fill="none" stroke="#B9AA91" strokeWidth={4} strokeLinecap="round" />
          <Face mood={mood} hidePupils={hidePupils} />
        </G>
      ) : (
        <G>
          <Path d="M120 216 Q114 156 120 68" stroke={EDGE} strokeWidth={9} fill="none" strokeLinecap="round" />
          {stage >= 3 && <G>
            <Leaf x={113} y={161} scale={1.25} color="#54A96A" />
            <Leaf x={128} y={166} flip scale={1.3} color="#54A96A" />
            <Leaf x={113} y={116} scale={1.15} />
            <Leaf x={127} y={113} flip scale={1.1} />
          </G>}
          {stage >= 2 && <G><Leaf x={117} y={91} scale={0.9} /><Leaf x={124} y={77} flip scale={0.88} color="#9DD38C" /></G>}
          {stage === 2 && <G><Leaf x={86} y={177} scale={0.72} /><Leaf x={154} y={172} flip scale={0.7} /></G>}
          {stage === 1 && <G><Leaf x={119} y={106} scale={0.74} /><Leaf x={122} y={91} flip scale={0.68} color="#9DD38C" /></G>}
          {stage >= 3 && <Leaf x={121} y={66} scale={0.72} color="#9DD38C" />}
          {stage === 4 && <G>
            <Path d="M120 68 L122 38 M77 118 L61 78 M162 118 L182 78" stroke={EDGE} strokeWidth={4} fill="none" />
            <Flower x={122} y={34} scale={0.88} /><Flower x={59} y={76} scale={0.7} /><Flower x={183} y={73} scale={0.76} />
          </G>}
          <Path d={stage === 1
            ? 'M120 112 C156 104 171 133 166 158 C162 184 140 198 120 197 C94 197 74 181 73 158 C69 131 85 108 120 112 Z'
            : 'M120 101 C159 89 179 123 174 153 C171 183 148 199 120 198 C90 200 66 181 65 151 C62 123 82 94 120 101 Z'}
          fill="#ACD994" stroke={EDGE} strokeWidth={3} />
          <Path d="M84 123 Q91 111 106 112" stroke="#D9EDBA" strokeWidth={5} strokeLinecap="round" fill="none" />
          <Face mood={mood} hidePupils={hidePupils} />
          <Path d="M76 205 L85 234 Q120 247 155 234 L164 205 Z" fill="#DCAC84" stroke="#9B7051" strokeWidth={3} />
          <Path d="M83 214 L89 231" stroke="#F3D2AD" strokeWidth={5} strokeLinecap="round" />
          <Path d="M72 201 Q120 193 168 201 L167 213 Q120 220 73 213 Z" fill="#EAC29A" stroke="#9B7051" strokeWidth={3} />
          <Path d="M112 227 Q120 219 128 227 Q123 237 120 238 Q116 235 112 227 Z" fill="#7B9C65" />
        </G>
      )}
      {mood === 'ecstatic' && <G><Sparkle x={40} y={115} /><Sparkle x={199} y={126} scale={1.2} /><Sparkle x={185} y={179} scale={0.7} /><Sparkle x={49} y={187} scale={0.65} /></G>}
      {mood === 'panicking' && <G stroke="#C58E39" strokeWidth={4} strokeLinecap="round"><Path d="M37 116 L28 109 M42 99 L38 88 M201 109 L210 101 M195 94 L198 83" /></G>}
    </Svg>
  );
}
