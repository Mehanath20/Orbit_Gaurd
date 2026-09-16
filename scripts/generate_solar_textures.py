import math
import random
from PIL import Image, ImageDraw, ImageFilter

def make_mars():
    w, h = 1024, 512
    im = Image.new("RGB", (w, h), (180, 75, 45))
    pixels = im.load()
    
    # Base Martian topography with dark maria and light deserts
    for y in range(h):
        lat = (y / h - 0.5) * math.pi
        cos_lat = math.cos(lat)
        for x in range(w):
            lon = (x / w) * 2 * math.pi
            
            # Multi-scale procedural noise
            n1 = math.sin(lon * 3 + math.sin(lat * 4)) * 0.5
            n2 = math.sin(lon * 7 - lat * 5) * 0.25
            n3 = math.sin(lon * 15 + lat * 12) * 0.12
            val = n1 + n2 + n3
            
            # Polar caps
            if y < 35 or y > h - 35:
                p_factor = max(0.0, 1.0 - (abs(y - (0 if y < 35 else h)) / 35.0))
                r = int(190 + p_factor * 60)
                g = int(140 + p_factor * 110)
                b = int(130 + p_factor * 125)
            elif val > 0.15:
                # Dark basaltic plains (Syrtis Major, etc.)
                darkness = (val - 0.15) * 1.5
                r = int(max(60, 150 - darkness * 70))
                g = int(max(40, 75 - darkness * 40))
                b = int(max(30, 50 - darkness * 30))
            else:
                # Rusty red/orange deserts
                r = int(min(240, 195 - val * 60))
                g = int(min(150, 95 - val * 40))
                b = int(min(100, 60 - val * 30))
                
            pixels[x, y] = (r, g, b)
            
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    im.save("public/textures/mars.jpg", quality=92)
    print("Mars texture generated")

def make_jupiter():
    w, h = 1024, 512
    im = Image.new("RGB", (w, h), (190, 155, 120))
    pixels = im.load()
    
    # Gaseous zonal jet bands
    band_colors = [
        (130, 90, 65),    # North Polar
        (190, 160, 130),  # North Temperate
        (160, 110, 80),   # North Tropical
        (220, 205, 185),  # Equatorial Zone
        (170, 105, 70),   # South Equatorial
        (205, 180, 150),  # South Tropical
        (150, 100, 75),   # South Temperate
        (120, 85, 65),    # South Polar
    ]
    
    for y in range(h):
        ny = y / h
        band_idx = min(len(band_colors) - 1, int(ny * len(band_colors)))
        base_c = band_colors[band_idx]
        
        for x in range(w):
            lon = (x / w) * 2 * math.pi
            # Atmospheric turbulence
            w1 = math.sin(lon * 12 + y * 0.15) * 15
            w2 = math.cos(lon * 24 - y * 0.3) * 8
            w3 = math.sin(lon * 4 + y * 0.05) * 20
            turb = w1 + w2 + w3
            
            # Great Red Spot at ~ (x=680, y=340)
            dx = (x - 680) / 45.0
            dy = (y - 335) / 22.0
            dist_grs = dx*dx + dy*dy
            
            if dist_grs < 1.0:
                # Inside Great Red Spot
                grs_factor = 1.0 - dist_grs
                r = int(min(255, 210 + grs_factor * 40))
                g = int(max(40, 85 - grs_factor * 35))
                b = int(max(30, 60 - grs_factor * 25))
            else:
                r = int(min(255, max(40, base_c[0] + turb * 0.9)))
                g = int(min(255, max(40, base_c[1] + turb * 0.7)))
                b = int(min(255, max(40, base_c[2] + turb * 0.5)))
                
            pixels[x, y] = (r, g, b)
            
    im = im.filter(ImageFilter.GaussianBlur(1.0))
    im.save("public/textures/jupiter.jpg", quality=92)
    print("Jupiter texture generated")

def make_saturn():
    w, h = 1024, 512
    im = Image.new("RGB", (w, h), (220, 195, 150))
    pixels = im.load()
    
    # Subtle golden and butterscotch gas bands
    for y in range(h):
        ny = y / h
        # Harmonic latitudinal variations
        v1 = math.sin(ny * math.pi * 14) * 15
        v2 = math.cos(ny * math.pi * 28) * 8
        base_lum = 210 + v1 + v2
        
        for x in range(w):
            lon = (x / w) * 2 * math.pi
            micro = math.sin(lon * 18 + y * 0.1) * 4
            
            r = int(min(255, max(120, base_lum + micro)))
            g = int(min(255, max(100, (base_lum - 25) * 0.95 + micro)))
            b = int(min(255, max(70, (base_lum - 65) * 0.85 + micro)))
            pixels[x, y] = (r, g, b)
            
    im = im.filter(ImageFilter.GaussianBlur(1.5))
    im.save("public/textures/saturn.jpg", quality=92)
    print("Saturn texture generated")

def make_saturn_rings():
    # Radial ring texture: 512 x 32
    w, h = 512, 32
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    
    for x in range(w):
        r_frac = x / w  # 0 = inner edge, 1 = outer edge
        
        # Cassini division around r_frac ~ 0.70 to 0.75
        if 0.69 < r_frac < 0.74:
            alpha = 15  # Gap
            color = (160, 140, 110, alpha)
        elif 0.15 < r_frac < 0.69:
            # Main B Ring (densest, brightest)
            grain = math.sin(r_frac * 200) * 20 + math.cos(r_frac * 400) * 15
            alpha = int(min(235, max(140, 180 + grain)))
            color = (225, 205, 170, alpha)
        elif 0.74 <= r_frac < 0.95:
            # A Ring
            grain = math.sin(r_frac * 300) * 18
            alpha = int(min(190, max(80, 130 + grain)))
            color = (205, 185, 150, alpha)
        else:
            # C Ring (translucent crepe ring)
            alpha = int(r_frac * 60)
            color = (150, 130, 100, alpha)
            
        draw.line([(x, 0), (x, h)], fill=color)
        
    im.save("public/textures/saturn-rings.png")
    print("Saturn rings generated")

def make_sun():
    w, h = 512, 256
    im = Image.new("RGB", (w, h), (255, 240, 180))
    pixels = im.load()
    
    for y in range(h):
        for x in range(w):
            # Granulation cells
            g1 = math.sin(x * 0.4 + math.sin(y * 0.3)) * 15
            g2 = math.cos(x * 0.8 - y * 0.5) * 10
            g3 = math.sin(x * 0.15 + y * 0.2) * 20
            v = g1 + g2 + g3
            
            r = 255
            g = int(min(255, max(160, 220 + v * 1.2)))
            b = int(min(220, max(60, 120 + v * 2)))
            pixels[x, y] = (r, g, b)
            
    im = im.filter(ImageFilter.GaussianBlur(1.0))
    im.save("public/textures/sun.jpg", quality=90)
    print("Sun texture generated")

def make_asteroid():
    w, h = 512, 256
    im = Image.new("RGB", (w, h), (100, 100, 100))
    pixels = im.load()
    
    for y in range(h):
        for x in range(w):
            # Crater bumps and rocky ridges
            c1 = math.sin(x * 0.1 + y * 0.1) * 30
            c2 = math.cos(x * 0.25 - y * 0.2) * 20
            c3 = math.sin(x * 0.5 + y * 0.4) * 15
            c4 = (math.sin(x * 0.04) * math.cos(y * 0.04)) * 40
            bump = 110 + c1 + c2 + c3 + c4
            
            b = int(min(255, max(40, bump)))
            pixels[x, y] = (b, int(b * 0.95), int(b * 0.9))
            
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    im.save("public/textures/asteroid.jpg", quality=90)
    print("Asteroid texture generated")

if __name__ == "__main__":
    make_mars()
    make_jupiter()
    make_saturn()
    make_saturn_rings()
    make_sun()
    make_asteroid()
