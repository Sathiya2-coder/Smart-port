import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "SMART-PORT | TECHNICAL STACK SPECIFICATION")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Footer
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        
        self.setFont("Helvetica", 8)
        self.drawString(54, 32, "Confidential — Smart-Port Maritime Intelligence System")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_text)
        self.restoreState()

def build_pdf(filename="Smart_Port_Technical_Stack.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#0f172a")    # Slate 900
    ACCENT = colors.HexColor("#0284c7")     # Sky 600
    TEAL = colors.HexColor("#0d9488")       # Teal 600
    DARK_TEXT = colors.HexColor("#1e293b")  # Slate 800
    MUTED_TEXT = colors.HexColor("#475569") # Slate 600
    BG_LIGHT = colors.HexColor("#f8fafc")   # Slate 50
    BORDER_COL = colors.HexColor("#cbd5e1") # Slate 300

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=ACCENT,
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=DARK_TEXT
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=PRIMARY
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("SMART-PORT", title_style))
    story.append(Paragraph("TECHNICAL STACK ARCHITECTURE SPECIFICATION", subtitle_style))
    story.append(Paragraph(
        "<b>System Classification:</b> Next-Generation Real-Time AIS Maritime Intelligence, Sonar HUD Scanner & Port Optimization Platform<br/>"
        "<b>Repository:</b> <font color='#0284c7'>https://github.com/Sathiya2-coder/Smart-port</font> | <b>Document Version:</b> 1.0.0",
        body_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=6, spaceAfter=14))

    # Executive Overview
    story.append(Paragraph("1. Executive Architecture Overview", section_heading))
    story.append(Paragraph(
        "Smart-Port is an enterprise-grade, high-performance Single Page Application (SPA) designed for real-time "
        "maritime telemetry monitoring, high-speed nautical geospatial cartography, acoustic Sonar HUD scanning, "
        "and predictive berth congestion analytics. The platform combines a reactive component architecture with hardware-accelerated "
        "canvas rendering and low-latency WebSocket stream processing.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Tech Stack Breakdown
    story.append(Paragraph("2. Detailed Layer-by-Layer Technical Stack", section_heading))

    # Layer 1
    story.append(Paragraph("<b>2.1. Frontend Core & Reactive Framework</b>", body_style))
    story.append(Paragraph("• <b>React 18.2.0:</b> Component-driven declarative UI utilizing concurrent rendering features, functional components, custom hooks, and memoized state hooks (<code>useState</code>, <code>useEffect</code>, <code>useRef</code>, <code>useCallback</code>).", bullet_style))
    story.append(Paragraph("• <b>Vite 5.1.6:</b> Next-generation frontend build tool and lightning-fast Hot Module Replacement (HMR) bundler powered by Rollup and native ES Modules (ESM).", bullet_style))
    story.append(Spacer(1, 4))

    # Layer 2
    story.append(Paragraph("<b>2.2. Marine Cartography & GIS Engine</b>", body_style))
    story.append(Paragraph("• <b>Leaflet 1.9.4:</b> High-performance mapping engine utilizing Hardware-Accelerated Canvas Rendering (<code>preferCanvas: true</code>) for smooth rendering of hundreds of concurrent vessels.", bullet_style))
    story.append(Paragraph("• <b>CartoDB Dark Matter Tiles:</b> Ultra-high-contrast nautical vector tile basemaps optimized for night-mode tactical naval operations.", bullet_style))
    story.append(Paragraph("• <b>Dynamic L.DivIcon & Micro-Badges:</b> Custom HTML/CSS glowing vessel beacons, true heading vectors, and permanent status pills.", bullet_style))
    story.append(Paragraph("• <b>Native ResizeObserver Engine:</b> Real-time container dimension observation ensuring flawless viewport calibration across mobile and desktop displays.", bullet_style))
    story.append(Spacer(1, 4))

    # Layer 3
    story.append(Paragraph("<b>2.3. Motion, Physics & Sonar Radar HUD</b>", body_style))
    story.append(Paragraph("• <b>GSAP 3.15.0 (GreenSock Animation Platform):</b> Powers 360° continuous polar radar sweeps, pulsing sonar range rings, and interactive micro-animations with 60fps GPU performance.", bullet_style))
    story.append(Paragraph("• <b>HTML5 Canvas 2D API:</b> Real-time sinusoidal acoustic waveform generator running on <code>requestAnimationFrame</code> for live sonar telemetry visualization.", bullet_style))
    story.append(Spacer(1, 4))

    # Layer 4
    story.append(Paragraph("<b>2.4. Styling, Design System & Glassmorphism</b>", body_style))
    story.append(Paragraph("• <b>Tailwind CSS 3.4.1 + PostCSS 8.4.35:</b> Utility-first CSS framework with tailored nautical color palettes and responsive breakpoints.", bullet_style))
    story.append(Paragraph("• <b>Aesthetic Paradigm:</b> Glassmorphic HUD with multi-layered backdrop blurs (<code>backdrop-blur-2xl</code>), glowing borders, and monospace telemetry typography.", bullet_style))
    story.append(Spacer(1, 4))

    # Layer 5
    story.append(Paragraph("<b>2.5. Real-Time Data Streaming & Protocol</b>", body_style))
    story.append(Paragraph("• <b>WebSocket Client:</b> Real-time AIS stream connector (<code>wss://stream.aisstream.io/v0/stream</code>).", bullet_style))
    story.append(Paragraph("• <b>Zero-Latency Dead-Reckoning Engine:</b> Mathematical vessel simulator generating live updates at 0ms delay to prevent network dropouts.", bullet_style))
    story.append(Spacer(1, 4))

    # Layer 6
    story.append(Paragraph("<b>2.6. Mathematical & Geodesic Algorithms</b>", body_style))
    story.append(Paragraph("• <b>Haversine Distance Formula:</b> Exact great-circle trigonometric formula computing true nautical distances (in km & nautical miles) between vessels and ports.", bullet_style))
    story.append(Paragraph("• <b>True Polar Bearing Projection:</b> Azimuth angle calculations mapping spherical geographic coordinates onto circular 2D polar radar coordinates (x = r·sin θ, y = -r·cos θ).", bullet_style))
    story.append(Spacer(1, 8))

    # Summary Architecture Table
    story.append(Paragraph("3. Technology Summary Matrix", section_heading))

    table_data = [
        [
            Paragraph("System Layer", table_header_style),
            Paragraph("Core Technology", table_header_style),
            Paragraph("Version", table_header_style),
            Paragraph("Primary Role & Capability", table_header_style)
        ],
        [
            Paragraph("Core Framework", table_cell_bold),
            Paragraph("React", table_cell_style),
            Paragraph("18.2.0", table_cell_style),
            Paragraph("SPA architecture, reactive state management & component lifecycle", table_cell_style)
        ],
        [
            Paragraph("Build & Bundler", table_cell_bold),
            Paragraph("Vite", table_cell_style),
            Paragraph("5.1.6", table_cell_style),
            Paragraph("Lightning-fast HMR dev server & optimized production Rollup bundling", table_cell_style)
        ],
        [
            Paragraph("GIS Cartography", table_cell_bold),
            Paragraph("Leaflet", table_cell_style),
            Paragraph("1.9.4", table_cell_style),
            Paragraph("Interactive marine map, hardware-accelerated canvas vessel rendering", table_cell_style)
        ],
        [
            Paragraph("Motion & Radar", table_cell_bold),
            Paragraph("GSAP + Canvas", table_cell_style),
            Paragraph("3.15.0", table_cell_style),
            Paragraph("Polar radar sweeps, acoustic wave HUD & micro-interactions", table_cell_style)
        ],
        [
            Paragraph("Styling & Tokens", table_cell_bold),
            Paragraph("Tailwind CSS", table_cell_style),
            Paragraph("3.4.1", table_cell_style),
            Paragraph("Dark-mode glassmorphism, responsive grid & tactical HUD theme", table_cell_style)
        ],
        [
            Paragraph("Iconography", table_cell_bold),
            Paragraph("Lucide React", table_cell_style),
            Paragraph("0.344.0", table_cell_style),
            Paragraph("High-clarity nautical, navigation & telemetry SVG icons", table_cell_style)
        ],
        [
            Paragraph("Data Pipeline", table_cell_bold),
            Paragraph("WebSockets + AIS", table_cell_style),
            Paragraph("Native", table_cell_style),
            Paragraph("Real-time telemetry streaming + zero-delay dead-reckoning engine", table_cell_style)
        ],
        [
            Paragraph("Geodesic Math", table_cell_bold),
            Paragraph("Haversine / Polar", table_cell_style),
            Paragraph("Algorithm", table_cell_style),
            Paragraph("Accurate spherical distance & polar radar angle projections", table_cell_style)
        ]
    ]

    col_widths = [90, 85, 50, 279]
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [BG_LIGHT, colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, ACCENT)
    ]))

    story.append(KeepTogether(t))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF Successfully Generated:", filename)

if __name__ == "__main__":
    build_pdf("Smart_Port_Technical_Stack.pdf")
