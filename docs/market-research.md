# Market research — free browser 2D optics sandbox (rays, observer eye, slit/grating diffraction with measured vs theory)
researched: 2026-10-26   verdict: crowded   sources: 30

## The space
- Category: free interactive physics-education simulations plus a thin layer of browser optics sandboxes; professional optical design (Zemax, 3DOptix, Optiland) sits above it and is not a sandbox. Sources: [PhET about](https://phet.colorado.edu/en/about), [3DOptix pricing](https://www.3doptix.com/pricing/).
- Size of the education pool: PhET reports 250M+ sim runs reaching 50M+ learners in 2025 and 1.8B+ cumulative runs since 2002 (self-reported; figure read from search result summary of the report, PDF too large to fetch): [PhET Impact Report 2025](https://phet.colorado.edu/publications/PhET_Impact_Report_2025.pdf), [2024 report](https://phet.colorado.edu/publications/PhET_Impact_Report_2024.pdf).
- Direction: older papers cite 45M runs/year and about 80M in 2017, so PhET volume grew several-fold over the period; the sources are different years and methods, so this is not a clean trend line: [PER Central](https://www.per-central.org/items/PERCFile.cfm?ID=4989), [PER Central](https://www.per-central.org/items/PERCFile.cfm?ID=4083). No search-trend or analyst report for "optics simulation" specifically was found.
- Niche activity is steady, not hot: Ray Optics Simulation is still shipping (v5.3.2, 2026-05-08; last push 2026-10-05) but Hacker News submissions about it have 0 to 2 comments each: [Zenodo](https://zenodo.org/records/20090812), [HN search](https://hn.algolia.com/api/v1/search?query=ray%20optics%20simulation&tags=story&hitsPerPage=10).
- Users describe the problem as "playing around" to build intuition and teacher "dynamical demonstrations", and engineers as designing a spectrometer or monochromator: [Ray Optics listing](https://github.com/ocolWopnu/ray-optics), [issue #121](https://github.com/ricktu288/ray-optics/issues/121).

## Competitors and alternatives
| name | what | for whom | price / licence | since | size signal | last update | source |
|---|---|---|---|---|---|---|---|
| Ray Optics Simulation (phydemo.app) | 2D geometric optics scenes; sources, mirrors, refraction, dispersion, GRIN, diffraction grating (ray-based), SVG export | students, teachers, hobbyists | free, Apache-2.0 | 2016 (repo created 2016-02-22) | 1,804 stars, 269 forks, 8 open issues (a mirror listing shows 1,536; sources differ, likely stale) | pushed 2026-10-05; v5.3.2 2026-05-08 | [GitHub API](https://api.github.com/repos/ricktu288/ray-optics), [Zenodo](https://zenodo.org/records/20090812) |
| PhET Bending Light | refraction, prisms, intensity, Snell, white-light prisms | K-12 and intro college | free, open source (licence page separate) | PhET since 2002 | PhET: 250M+ runs in 2025 (all sims) | repo active 2026-09-13; v1.2 release Dec 2024 | [PhET about](https://phet.colorado.edu/en/about), [bending-light issues](https://api.github.com/repos/phetsims/bending-light/issues?state=all&per_page=15) |
| PhET Wave Interference | water, sound, light waves, double slit | K-12 and intro college | free, open source | PhET since 2002 | same as above | v2.1 deploy 2026-08-27 | [wave-interference issues](https://api.github.com/repos/phetsims/wave-interference/issues?state=all&per_page=15) |
| Falstad Ripple Tank | 2D wave tank: interference, diffraction, refraction, Doppler | physics and engineering learners | free; page states no licence; source at pfalstad/ripplegl-ts | not stated on page | HN posts 0 to 1 point | no date on page | [Falstad ripple](https://www.falstad.com/ripple/), [HN](https://hn.algolia.com/api/v1/search?query=falstad%20ripple&tags=story&hitsPerPage=5) |
| 3DOptix | cloud 3D optical design, sequential and non-sequential ray tracing | engineers, academic groups, students | no free plan; 7-day trial; Student $40/mo (basic ray tracing, one wavelength, public designs), Enterprise $180/mo, Academic $198/mo | not found | no independent reviews found | pricing page current | [pricing](https://www.3doptix.com/pricing/) |
| Optiland | Python optical design, differentiable GPU ray tracing | researchers, optical engineers | MIT | repo created 2017-08-15 | 1,031 stars, 53 open issues | pushed 2026-10-26 | [GitHub API](https://api.github.com/repos/optiland/optiland) |
| Meep | FDTD electromagnetic solver | researchers | GPL-2.0 | repo created 2014-03-28 | 1,826 stars, 402 open issues | pushed 2026-10-24 | [GitHub API](https://api.github.com/repos/NanoComp/meep) |
| oPhysics / OptiLight / WebTOP (long tail) | single-purpose double-slit, lens, aberration sims; WebTOP is 3D, VRML/Java based | students | free | not found | not found | not found | [oPhysics](https://ophysics.com/l.html), [OptiLight](https://nikame.itch.io/optilight), [WebTOP paper](https://spiedigitallibrary.org/conference-proceedings-of-spie/9663/96630K/The-Optics-Project-on-the-Web-WebTOP/10.1117/12.2207350.full) |
| Do nothing: textbook diagrams, hand ray drawing, spreadsheets | static or manual | everyone | free | n/a | n/a | n/a | reasoning, no source |

## What users complain about
No Reddit threads or app-store/G2/Capterra reviews for these tools surfaced in searches; the evidence below comes from GitHub issues (maintainer and QA trackers) and is thinner than review-site evidence.
- "It can be tedious to pan or zoom the camera" and users "have to wait for the ray calculations to be done all over again" — Ray Optics — [issue #374, 2026-08-29](https://github.com/ricktu288/ray-optics/issues/374)
- Ray counts differ between "identical" setups; cause: "The power of individual rays saturates to a constant value when ray density is too low" — Ray Optics — [issue #149, 2024-07-08](https://github.com/ricktu288/ray-optics/issues/149)
- Focal-length sign confusing: sim "is using image focal length as parameter for ideal lens and ideal mirrors" — Ray Optics — [issue #50, 2022-08-26](https://github.com/ricktu288/ray-optics/issues/50) (older than 24 months)
- Drawing rays is "slow"; "Grid rendering is extremely slow" — Ray Optics — [issue search](https://api.github.com/search/issues?q=repo:ricktu288/ray-optics+(mobile+OR+touch+OR+phone+OR+slow+OR+lag)&per_page=15) (issue #113, 2023-09-06, older than 24 months), [issue #370, 2026-08-21](https://github.com/ricktu288/ray-optics/issues/370)
- GRIN tool: "the reflected rays on the surface are missing currently"; Euler solver "susceptible to numerical errors" — Ray Optics — [issue #69, 2022-11-05](https://github.com/ricktu288/ray-optics/issues/69) (older than 24 months)
- Diffraction gratings were added as ray-by-order mirror segments, not as wave interference — Ray Optics — [issue #121, 2024-02-24](https://github.com/ricktu288/ray-optics/issues/121)
- "Performance is poor on prisms screen with white light [Chromebook]"; "significant slowdown", fixed in RC.4 — PhET Bending Light — [issue #433, 2024-12-09](https://github.com/phetsims/bending-light/issues/433)
- PhET Bending Light computes intensities "assuming a parallel polarized incident beam" and its wave speed "may make understanding difficult" — PhET — [teacher tips via search](https://clixplatform.tiss.edu/phet/files/teachers-guide/bending-light-guide.pdf), undated
- Falstad page mentions only mouse interaction, no touch or mobile note — Falstad — [page](https://www.falstad.com/ripple/) (absence on the page, not a user complaint)
- 3DOptix "cloud-centric design means limited features available for offline work"; advanced features "might require time and training" — 3DOptix — [SaaSHub aggregator via search](https://www.saashub.com/compare-3doptix-vs-luminous-objects-clock), no user comments

Shared by most: performance cliffs when many rays or objects are in play (Ray Optics, PhET prisms); sims that show light behaviour but not measured values against theory in real units; no single tool joins rays, waves and an observer view. The last point is the author's reading of the product pages, not a quoted complaint.

## What users praise (table stakes)
- Drag-and-drop, immediate live updating, "playing around" to build intuition — Ray Optics, PhET — [Ray Optics listing](https://github.com/ocolWopnu/ray-optics), [PhET teaching guide](https://serc.carleton.edu/sp/compadre/phet/how.html)
- Free, runs in the browser, offline download and apps available — PhET — [PhET about](https://phet.colorado.edu/en/about)
- Teacher flexibility: teachers value using one sim in several ways, and student control of the sim — PhET — [PER Central](https://www.per-central.org/items/PERCFile.cfm?ID=4989)
- Shareable scenes, gallery of examples, SVG export, translations (Hosted Weblate PRs every few weeks) — Ray Optics — [recent items](https://api.github.com/repos/ricktu288/ray-optics/issues?state=all&per_page=30&sort=created&direction=desc)
- Multiple languages: 48 language options — PhET — [PhET about](https://phet.colorado.edu/en/about)
- Open source and active maintenance — Ray Optics, PhET, Optiland — [Ray Optics](https://api.github.com/repos/ricktu288/ray-optics), [Optiland](https://api.github.com/repos/optiland/optiland)

## The gap
- No surveyed tool puts ray tracing with Fresnel/dispersion, wave diffraction with measured fringes against theory, and an observer eye in one scene. Ray Optics' grating is ray-order based ([issue #121](https://github.com/ricktu288/ray-optics/issues/121)); PhET and Falstad show waves without a measured-vs-theory panel (reading of their pages, [Falstad](https://www.falstad.com/ripple/)).
- Candidate wedges from the complaints: (1) responsiveness while panning, zooming and with many rays, since both Ray Optics and PhET have open or fixed issues on it ([#374](https://github.com/ricktu288/ray-optics/issues/374), [#433](https://github.com/phetsims/bending-light/issues/433)); (2) numbers with stated assumptions and regime warnings (ray-density saturation confused users in [#149](https://github.com/ricktu288/ray-optics/issues/149)); (3) integrated rays plus wave measurement; (4) eye path analysis, for which no competitor feature was found.
- Evidence that users want (3) or (4) is not in the complaint data; it is the author's hypothesis.

## Risks
- Large free incumbent in education: PhET at 250M+ runs/year, funded by foundations, free and open source ([PhET about](https://phet.colorado.edu/en/about)).
- Free open-source option that is good enough for rays: Ray Optics, 1.8k stars, maintained for 10 years, adding diffraction gratings and GRIN ([GitHub API](https://api.github.com/repos/ricktu288/ray-optics)). It could add wave views; no sign of that in the issues read.
- Low community signal: HN stories on ray-optics tools draw 0 to 2 comments, so organic discovery may be slow ([HN search](https://hn.algolia.com/api/v1/search?query=ray%20optics%20simulation&tags=story&hitsPerPage=10)).
- Monetisation: the paid neighbour, 3DOptix, charges $40 to $198/month for 3D engineering features with no free plan ([pricing](https://www.3doptix.com/pricing/)); a free 2D sandbox has no demonstrated paid demand in this data.
- Licence caution: Falstad has no stated licence and PhET's licence is on a separate page ([Falstad](https://www.falstad.com/ripple/), [PhET about](https://phet.colorado.edu/en/about)); reuse of code is not cleared, consistent with the vision doc.
- Ray Optics is Apache-2.0 with a mirror-listed star count that differs from the API (1,536 vs 1,804); treat popularity as roughly 1.5k to 1.8k.

## Verdict
crowded. A free, maintained, 10-year-old 2D ray sandbox exists, and PhET owns education reach with foundation funding. The complaints found are about performance and unclear numbers, not about missing categories, so demand for a new entrant rests on the combination of rays, measured wave diffraction and eye analysis.
The PRD should commit to the combined rays-plus-waves-with-measured-values wedge and to a responsiveness target (pan and zoom without retracing delay; many-ray scenes), and should treat the eye feature as a hypothesis to test with real users in milestone 1.
Evidence that would move this toward viable-if: user threads or reviews asking for measured wave values or observer views, or first-week scene-link sharing from teachers.

## Sources
- https://api.github.com/repos/ricktu288/ray-optics — repo — 2026-10-26
- https://github.com/ricktu288/ray-optics/issues/374 — repo issue — 2026-08-29
- https://github.com/ricktu288/ray-optics/issues/149 — repo issue — 2024-07-08
- https://github.com/ricktu288/ray-optics/issues/69 — repo issue — 2022-11-05
- https://github.com/ricktu288/ray-optics/issues/50 — repo issue — 2022-08-26
- https://github.com/ricktu288/ray-optics/issues/121 — repo issue — 2024-02-24
- https://api.github.com/search/issues?q=repo:ricktu288/ray-optics+(mobile+OR+touch+OR+phone+OR+slow+OR+lag)&per_page=15 — repo issue search — 2026-10-26
- https://api.github.com/repos/ricktu288/ray-optics/issues?state=all&per_page=30&sort=created&direction=desc — repo — 2026-10-26
- https://github.com/ocolWopnu/ray-optics — repo mirror — undated
- https://zenodo.org/records/20090812 — release — 2026-05-08
- https://phet.colorado.edu/en/about — docs — 2026-10-26
- https://phet.colorado.edu/publications/PhET_Impact_Report_2025.pdf — report — 2025
- https://phet.colorado.edu/publications/PhET_Impact_Report_2024.pdf — report — 2024
- https://github.com/phetsims/bending-light/issues/433 — repo issue — 2024-12-09
- https://api.github.com/repos/phetsims/bending-light/issues?state=all&per_page=15 — repo — 2026-10-26
- https://api.github.com/repos/phetsims/wave-interference/issues?state=all&per_page=15 — repo — 2026-10-26
- https://clixplatform.tiss.edu/phet/files/teachers-guide/bending-light-guide.pdf — docs — undated
- https://serc.carleton.edu/sp/compadre/phet/how.html — docs — undated
- https://www.per-central.org/items/PERCFile.cfm?ID=4989 — report — 2018 onward
- https://www.per-central.org/items/PERCFile.cfm?ID=4083 — report — older
- https://www.falstad.com/ripple/ — docs — 2026-10-26
- https://www.3doptix.com/pricing/ — docs — 2026-10-26
- https://www.saashub.com/compare-3doptix-vs-luminous-objects-clock — review site (aggregator) — undated
- https://api.github.com/repos/optiland/optiland — repo — 2026-10-26
- https://api.github.com/repos/NanoComp/meep — repo — 2026-10-26
- https://hn.algolia.com/api/v1/search?query=ray%20optics%20simulation&tags=story&hitsPerPage=10 — forum — 2026-10-26
- https://hn.algolia.com/api/v1/search?query=falstad%20ripple&tags=story&hitsPerPage=5 — forum — 2026-10-26
- https://ophysics.com/l.html — docs — undated
- https://nikame.itch.io/optilight — docs — undated
- https://spiedigitallibrary.org/conference-proceedings-of-spie/9663/96630K/The-Optics-Project-on-the-Web-WebTOP/10.1117/12.2207350.full — report — 2015
