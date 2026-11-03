param(
    [double]$Saturation = 1.65,
    [double]$Contrast = 1.08,
    [double]$Brightness = 0.015
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class RpgColorBoost
{
    private static double HueToRgb(double p, double q, double t)
    {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1.0 / 6.0) return p + (q - p) * 6 * t;
        if (t < 1.0 / 2.0) return q;
        if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6;
        return p;
    }

    private static byte ToByte(double value)
    {
        return (byte)Math.Round(Math.Max(0, Math.Min(1, value)) * 255);
    }

    public static void Apply(string path, double saturationScale, double contrast, double brightness)
    {
        using (var source = new Bitmap(path))
        using (var image = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            image.SetResolution(source.HorizontalResolution, source.VerticalResolution);
            using (var graphics = Graphics.FromImage(image))
            {
                graphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
                graphics.DrawImageUnscaled(source, 0, 0);
            }

            var rect = new Rectangle(0, 0, image.Width, image.Height);
            var data = image.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            var bytes = Math.Abs(data.Stride) * data.Height;
            var pixels = new byte[bytes];
            Marshal.Copy(data.Scan0, pixels, 0, bytes);

            for (var y = 0; y < data.Height; y++)
            for (var x = 0; x < data.Width; x++)
            {
                var i = y * data.Stride + x * 4;
                if (pixels[i + 3] == 0) continue;

                var b = pixels[i] / 255.0;
                var g = pixels[i + 1] / 255.0;
                var r = pixels[i + 2] / 255.0;
                var max = Math.Max(r, Math.Max(g, b));
                var min = Math.Min(r, Math.Min(g, b));
                var lightness = (max + min) / 2.0;
                var chroma = max - min;
                var hue = 0.0;
                var saturation = 0.0;

                if (chroma > 0)
                {
                    saturation = chroma / (1 - Math.Abs(2 * lightness - 1));
                    if (max == r) hue = ((g - b) / chroma + (g < b ? 6 : 0)) / 6.0;
                    else if (max == g) hue = ((b - r) / chroma + 2) / 6.0;
                    else hue = ((r - g) / chroma + 4) / 6.0;
                }

                // Strongly enrich muted colors while leaving hue, alpha, and geometry untouched.
                saturation = Math.Min(1, saturation * saturationScale + (1 - saturation) * 0.06);
                lightness = Math.Max(0, Math.Min(1, (lightness - 0.5) * contrast + 0.5 + brightness));

                if (saturation == 0)
                {
                    r = g = b = lightness;
                }
                else
                {
                    var q = lightness < 0.5
                        ? lightness * (1 + saturation)
                        : lightness + saturation - lightness * saturation;
                    var p = 2 * lightness - q;
                    r = HueToRgb(p, q, hue + 1.0 / 3.0);
                    g = HueToRgb(p, q, hue);
                    b = HueToRgb(p, q, hue - 1.0 / 3.0);
                }

                pixels[i] = ToByte(b);
                pixels[i + 1] = ToByte(g);
                pixels[i + 2] = ToByte(r);
            }

            Marshal.Copy(pixels, 0, data.Scan0, bytes);
            image.UnlockBits(data);
            image.Save(path + ".recolored", ImageFormat.Png);
        }

        System.IO.File.Copy(path + ".recolored", path, true);
        System.IO.File.Delete(path + ".recolored");
    }
}
'@ -ReferencedAssemblies System.Drawing

$assets = @(
    'img/faces/RPGPortrait_bard_v5.png',
    'img/faces/RPGPortrait_druid_v5.png',
    'img/characters/RPGWalk_bard_male_v5.png',
    'img/characters/RPGWalk_bard_female_v5.png',
    'img/characters/RPGWalk_druid_male_v5.png',
    'img/characters/RPGWalk_druid_female_v5.png'
)

foreach ($asset in $assets) {
    $resolved = (Resolve-Path -LiteralPath $asset).Path
    [RpgColorBoost]::Apply($resolved, $Saturation, $Contrast, $Brightness)
    Write-Output "Recolored $asset"
}
