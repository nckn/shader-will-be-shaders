// Simplex noise function
        float noise(vec2 st) {
            vec4 K = vec4(0.0, -1.0, 1.0, -1.0);
            vec2 p = floor(st.xy);
            vec2 a = st.xy - p;
            vec2 b = a - vec2(1.0, 0.0);
            vec2 c = a - vec2(0.0, 1.0);
            vec2 d = a - vec2(1.0, 1.0);
            vec4 s = vec4(a.x + a.y, b.x + b.y, c.x + c.y, d.x + d.y);
            vec4 sh = step(s, vec4(s.yzxw));
            vec4 a0 = s + K.xyzw * sh;
            vec4 a1 = s + K.wxyz * sh;
            vec4 b0 = a0.xyxy + K.zzww;
            vec4 b1 = a1.xyxy + K.zzww;
            b0 = b0.xzyw;
            vec4 s0 = a0.xzyw + a1.xzyw * -7.0;
            vec4 s1 = b0.xzyw + b1.xzyw * -7.0;
            vec4 shh = step(s0, vec4(s1.yzxw));
            vec4 a00 = vec4(s0.x, s1.x, s0.y, s1.y);
            vec4 a11 = vec4(s0.z, s1.z, s0.w, s1.w);
            vec4 a0a1 = a00.xzyw + a11.xzyw * shh;
            a0 = mix(a0a1, a0a1.yyxx, shh.xxyy);
            vec4 p0 = vec4(a0.xy, b0.xy);
            vec4 p1 = vec4(a0.zw, b0.zw);
            p0 = p0.xzyw * sh + p1.xzyw * (1.0 - sh);
            return dot(p0, vec4(1.0 / 89.0));
        }
        
        uniform float time;
        uniform sampler2D hmap;
        uniform vec2 cursorPosition;
        uniform vec2 resolution;
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform sampler2D u_tex;
        
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
            vec2 normalizedCoords = gl_FragCoord.xy / resolution.xy;
            float distanceFromCursor = distance(normalizedCoords, cursorPosition);
            float displacementFactor = smoothstep(0.0, 0.1, distanceFromCursor);
            vec3 dColor = vec3(displacementFactor);
        
            vec4 texel = texture2D(hmap, vUv);
            float hue = clamp(cos(time * 0.1), 0.0, 1.0);
            vec3 rgb = hsv2rgb(vec3(hue, hue, hue));
        
            float shift = sin(texel.r * (cos(time * 1.0)));
            float shift2 = sin(texel.r * (sin(time * 1.0)));
        
            vec3 shiftedColor = vec3((gl_FragColor.r + shift2), gl_FragColor.g - shift, gl_FragColor.b + shift);
        
            vec3 tColor = texture2D(u_tex, vUv).rgb;
        
            // Add noise to fragment
            float n = noise(gl_FragCoord.xy * 0.01);
            gl_FragColor = vec4(tColor.r * shiftedColor.r + n, tColor.g * shiftedColor.g + n, tColor.b * shiftedColor.b + n, 1.0);
        }