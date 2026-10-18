import { Circle, Ellipse, G, Path } from 'react-native-svg';

const INK = '#203D2C';

export function Pupils({ mood }) {
  const alarm = mood === 'panicking';
  const worry = mood === 'nervous' || mood === 'sweating';
  return <G stroke="none">
    <Ellipse cx={worry ? 104 : 101} cy={alarm ? 145 : 144} rx={alarm ? 4 : 4.5} ry={alarm ? 6 : 6.5} fill={INK} />
    <Ellipse cx={worry ? 142 : 139} cy={alarm ? 145 : 144} rx={alarm ? 4 : 4.5} ry={alarm ? 6 : 6.5} fill={INK} />
    <Circle cx={worry ? 102 : 99} cy={140} r={1.8} fill="white" />
    <Circle cx={worry ? 140 : 137} cy={140} r={1.8} fill="white" />
  </G>;
}

export default function Face({ mood, hidePupils = false }) {
  const alarm = mood === 'panicking';
  const worry = mood === 'nervous' || mood === 'sweating';
  const tired = mood === 'defeated';
  const joy = mood === 'ecstatic';
  const smug = mood === 'smug';
  return (
    <G stroke={INK} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx={86} cy={157} rx={9} ry={5} fill="#F2B0A0" stroke="none" opacity={0.7} />
      <Ellipse cx={154} cy={157} rx={9} ry={5} fill="#F2B0A0" stroke="none" opacity={0.7} />
      {joy ? (
        <G fill="none"><Path d="M94 144 Q102 132 110 144" /><Path d="M130 144 Q138 132 146 144" /></G>
      ) : smug || tired ? (
        <G>
          <Path d={smug ? 'M92 140 L110 140 M130 136 L148 136' : 'M92 142 Q101 147 110 142 M130 142 Q139 147 148 142'} fill="none" />
          {smug && <G fill={INK} stroke="none"><Path d="M96 141 Q101 154 106 141 Z" /><Path d="M134 137 Q139 150 144 137 Z" /></G>}
        </G>
      ) : (
        <G>
          <Ellipse cx={101} cy={143} rx={alarm ? 12 : 9} ry={alarm ? 16 : 12} fill="#FFFFFF" strokeWidth={2.5} />
          <Ellipse cx={139} cy={143} rx={alarm ? 12 : 9} ry={alarm ? 16 : 12} fill="#FFFFFF" strokeWidth={2.5} />
          {!hidePupils && <Pupils mood={mood} />}
        </G>
      )}
      {worry && <G fill="none"><Path d="M92 127 L108 123" /><Path d="M132 123 L148 127" /></G>}
      {alarm && <G fill="none"><Path d="M89 121 Q99 113 108 120" /><Path d="M132 120 Q142 113 151 121" /></G>}
      {smug ? <Path d="M108 163 Q124 172 137 157" fill="none" />
        : worry ? <Path d="M107 166 Q112 159 117 165 Q122 171 127 165 Q132 159 137 166" fill="none" />
          : alarm ? <Ellipse cx={120} cy={169} rx={10} ry={13} fill={INK} />
            : tired ? <G><Path d="M109 170 Q120 162 131 170" fill="none" /><Path d="M150 171 Q164 166 162 175 Q174 173 172 182" fill="none" stroke="#86A892" strokeWidth={2} /></G>
              : joy ? <G><Path d="M103 158 Q120 166 137 158 Q134 181 120 181 Q106 180 103 158 Z" fill={INK} /><Path d="M111 175 Q120 169 129 175" fill="none" stroke="#F4B0A7" strokeWidth={5} /></G>
                : <Path d="M108 160 Q120 174 132 160" fill="none" />}
      {mood === 'sweating' && <G fill="#8ACFE3" stroke="#398DA8" strokeWidth={1.5}><Path d="M164 126 Q178 144 166 147 Q154 145 164 126 Z" /><Path d="M78 121 Q69 135 78 137 Q87 135 78 121 Z" /></G>}
    </G>
  );
}
