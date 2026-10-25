// License check for .NET desktop apps (WinForms / WPF / console), Windows.
// NuGet: BouncyCastle.Cryptography
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

public static class LicenseCheck
{
    // ====== CHANGE THESE TWO PER APP ======
    const string AppCode = "myapp";
    const string PublicKey = "PASTE_PUBLIC_KEY_FROM_GENERATOR_KEYS_TAB";
    // ======================================

    static readonly string Dir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), AppCode);
    static string LicFile => Path.Combine(Dir, "license.key");
    static string SeenFile => Path.Combine(Dir, "license.seen");

    static byte[] B64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        s += new string('=', (4 - s.Length % 4) % 4);
        return Convert.FromBase64String(s);
    }

    static string Normalize(string s)
    {
        var r = new string(s.ToUpperInvariant().Where(Uri.IsHexDigit).ToArray());
        return r.Length == 20
            ? string.Join("-", Enumerable.Range(0, 5).Select(i => r.Substring(i * 4, 4)))
            : null;
    }

    public static string GetDeviceId()
    {
        string guid = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "MachineGuid", "")?.ToString() ?? "";
        string cpu = Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "";
        string raw = "GLN-DEVID-v1|win|" + guid + "|" + cpu + "|" + RuntimeInformationArch();
        var hex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
        return Normalize(hex.Substring(0, 20));
    }

    static string RuntimeInformationArch() =>
        System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString().ToLowerInvariant();

    public record Result(bool Ok, string Reason, int? DaysLeft);

    public static Result Verify(string license)
    {
        try
        {
            var p = license.Trim().Split('.');
            if (p.Length != 3 || p[0] != "GLN1") return new(false, "format", null);
            var body = B64Url(p[1]);
            var sig = B64Url(p[2]);

            var v = new Ed25519Signer();
            v.Init(false, new Ed25519PublicKeyParameters(B64Url(PublicKey), 0));
            v.BlockUpdate(body, 0, body.Length);
            if (!v.VerifySignature(sig)) return new(false, "signature", null);

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            if (root.GetProperty("app").GetString() != AppCode) return new(false, "app", null);
            if (root.GetProperty("did").GetString() != GetDeviceId()) return new(false, "device", null);

            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            long last = File.Exists(SeenFile) && long.TryParse(File.ReadAllText(SeenFile), out var l) ? l : 0;
            if (last != 0 && now + 300 < last) return new(false, "clock", null);

            long exp = root.GetProperty("exp").GetInt64();
            if (exp != 0 && now >= exp) return new(false, "expired", null);

            Directory.CreateDirectory(Dir);
            File.WriteAllText(SeenFile, Math.Max(now, last).ToString());
            return new(true, "", exp == 0 ? null : (int)Math.Ceiling((exp - now) / 86400.0));
        }
        catch { return new(false, "format", null); }
    }

    public static Result Activate(string license)
    {
        var r = Verify(license);
        if (r.Ok) { Directory.CreateDirectory(Dir); File.WriteAllText(LicFile, license.Trim()); }
        return r;
    }

    public static Result CheckSaved() =>
        File.Exists(LicFile) ? Verify(File.ReadAllText(LicFile)) : new(false, "format", null);
}
