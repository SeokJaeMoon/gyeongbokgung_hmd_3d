# 경복궁 스마트시티 디지털 트윈 — 자율주행차·드론 HMD 체험

HTML5 / Three.js r180(0.180.0) / JavaScript ES Modules로 개발한 학습용 가상 3D 환경입니다.
**가상 경복궁의 치수·동선·주행 단위·비행 고도는 실제 경복궁의 측량·운행 허가·항공규정을 나타내지 않습니다.**

## 다운로드 구성

- `ThreeJS_경복궁_스마트시티_차량_드론_HMD.html`: 앱 코드를 통합한 단일 HTML. 온라인에서 Three.js CDN에 연결해야 합니다. Chrome·Edge·Safari에서 파일 직접 열기 시도를 지원하지만, 실패하면 아래 로컬 서버 실행을 권장합니다.
- `index.html`: 분리 소스의 진입점. Three.js CDN에 연결합니다.
- `index.offline.html`: `vendor/`로 Three.js를 다운로드한 후 사용합니다.
- `js/sim.mjs`: 실제 렌더러와 독립된 도로·항공 경로 탐색 및 운행 상태 기계.
- `js/world.js`: 경복궁 전각·담장·연못·공원·바깥 현대 스마트시티·차량·드론 모델.
- `js/hmd.js`: 실제 Three.js 3D 평면의 HMD형 제어·관제 패널과 클릭 영역.
- `js/main.js`: UI 입력/이벤트/관찰 카메라/WebXR 연결.
- `tests/sim.test.mjs`: Node.js 자동 테스트.
- `server.cjs`: 설치 패키지가 필요 없는 로컬 개발 서버.
- `download-three.cjs`: 사전 온라인 접속 시 Three.js 핵심 파일을 로컬 다운로드.
- `build-single.cjs`: 단일 HTML 재생성.

## 실행 방법 A: VS Code (Windows 및 macOS)

1. ZIP 압축을 풀고 `gyeongbokgung_hmd_3d` 폴더를 VS Code에서 엽니다.
2. VS Code에 **Live Server** 확장 프로그램을 설치합니다.
3. `index.html`을 우클릭해 **Open with Live Server**를 실행합니다.
4. Three.js는 최초에 온라인 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 실행 방법 B: Node.js 로컬 서버

Windows PowerShell 또는 macOS 터미널에서:

```bash
cd gyeongbokgung_hmd_3d
node server.cjs
```

브라우저에서 `http://127.0.0.1:8000` 접속. `npm install`이 필요하지 않습니다.

## 실행 방법 C: 인터넷 없이 실행(사전 준비 필요)

**인터넷이 되는 PC에서 한 번** 다운로드합니다:

```bash
node download-three.cjs
```

성공하면 `vendor/build/three.core.js`, `vendor/build/three.module.js`, `vendor/examples/jsm/controls/OrbitControls.js`, `vendor/examples/jsm/webxr/VRButton.js`가 생성됩니다.
이 네 파일을 포함한 프로젝트 폴더를 오프라인 PC에 복사한 뒤:

```bash
node server.cjs
```

`http://127.0.0.1:8000/index.offline.html`에 접속합니다. 이 프로젝트를 실행하는 데는 빌드/번들러나 서버 데이터베이스가 필요 없습니다.

## 조작

1. `자동차 출발지·도착지` / `드론 출발지·도착지`에 등록 장소 이름을 입력합니다.
2. **경로 계산·배치**를 눌러 각각의 경로를 표시합니다.
3. **동시 출발** → HMD 화면에 차량 속도, 드론 고도, 신호·상태를 표시합니다.
4. **장애물 추가** → 가상 차량 통로 위의 방호벽에서 정지합니다. **장애물 제거** → 재출발합니다.
5. **도시 전체 / 차량 HMD / 드론 FPV / 차량 추적**으로 관찰 시점을 변경합니다.
6. 설정에 따라 **가상 보호구역 우회**, **가상 드론 고도 7·10·13**, **배속**, **야간 모드**를 변경합니다.
7. **운행 기록 JSON 저장**을 누르면 교육용 이벤트·경로 요약을 다운로드합니다.

### 단축키

- `1`: 도시 전체
- `2`: 차량 HMD
- `3`: 드론 FPV
- `4`: 차량 추적
- `Space`: 운행 시작 또는 일시 정지
- `O`: 장애물 추가/제거
- `H`: 현재 관찰 모드 정면 복귀
- 마우스 드래그: 도시 전체 시점 회전 / 휠: 확대·축소

### HMD/WebXR 모드

지원 기기·브라우저에서 `ENTER VR` 버튼을 사용합니다. 컨트롤러의 레이와 트리거로 HMD 3D 메뉴를 선택합니다. PC에서는 마우스로도 HMD 패널을 클릭할 수 있습니다. 실제 안경의 광학 손 추적/핀치 입력은 구현하지 않았습니다.

독립형 HMD는 **HTTPS 보안 접속** 및 해당 기기의 WebXR 지원이 필요할 수 있습니다. PC의 `localhost`는 다른 HMD의 PC 주소가 아닙니다. 오프라인 HTML 파일을 더블클릭하는 것만으로 HMD에서 immersive VR이 작동하는 것은 아닙니다.

## 가상 지형과 장소

광화문, 흥례문, 근정전, 사정전, 경회루, 강녕전, 교태전, 향원정, 건청궁, 국립민속박물관, 신무문.
도심 스마트시티 빌딩은 경복궁 담장 밖에서만 표현하며, 궁 안의 도로와 신호 장치는 **실제 도로가 아닌 교육용 가상 스마트 모빌리티 통로**입니다.

**주의:** 서울 도심·광화문은 실제 드론 운항 제한이 있는 지역입니다. 이 코드를 실제 비행, 촬영 또는 궁 내 자율주행차 운행 허가 자료로 사용하면 안 됩니다.

## 검증

```bash
node --test tests/sim.test.mjs
```

최종 테스트: **9개 테스트 통과**. 11개 장소의 110개 상이한 출발·도착 조합에서 도로 및 항공 경로 계산과 최종 도착을 검사했으며, 660개 항공 경로 설정(3개 고도 × 보호구역 적용/해제 × 110개 장소 조합), 신호 대기, 장애물 정지·재출발, 일시 정지, 잘못된 입력 처리를 검사했습니다.

JavaScript 문법과 단일 HTML 내부 스크립트 문법을 검사했습니다. 제작 환경에서는 외부 Three.js 모듈 다운로드 및 실제 WebGL/HMD 실행이 제한되어, **3D 렌더링 결과와 HMD 착용 상태는 실기기에서 아직 검증하지 못했습니다.** 모듈 로딩 실패 시에는 빈 화면이 아닌 `2D 진단 안내도`가 표시됩니다. 이 진단 안내도는 3D 실행 결과가 아닙니다.

## 출처 / 참고

- 경복궁 배치: 한국학중앙연구원 궁궐 지도 https://www.aks.ac.kr/cefia/webzine/2101/focus_eng.html
- 궁능유적본부 경복궁 촬영·관람 규정: https://royal.khs.go.kr/ROYAL/contents/R704000000.do?schGroupCode=gbg
- 서울 도심 드론 제한 안내: https://news.seoul.go.kr/safe/archives/518080
- Three.js ES Modules: https://threejs.org/manual/pages/fundamentals.html
- OrbitControls: https://threejs.org/docs/pages/OrbitControls.html
- Three.js 라이선스: https://github.com/mrdoob/three.js/blob/master/LICENSE (MIT)
