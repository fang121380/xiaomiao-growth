#!/usr/bin/env swift
// 用 macOS 自带的 Cocoa 处理 PNG：去 AI 水印 + 加 padding + 一次性输出所有尺寸
// 用法: swift make-app-icon.swift <input.png> <output-dir> [bg-color-hex]

import AppKit
import Foundation

guard CommandLine.arguments.count >= 3 else {
    print("用法: swift make-app-icon.swift <input.png> <output-dir> [bgColor]")
    exit(1)
}

let inputPath = CommandLine.arguments[1]
let outputDir = CommandLine.arguments[2]
let bgHex = CommandLine.arguments.count >= 4 ? CommandLine.arguments[3] : "#FFF1D6"

guard let original = NSImage(contentsOfFile: inputPath),
      let tiff = original.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff) else {
    print("❌ 读图失败: \(inputPath)")
    exit(1)
}

let origW = bitmap.pixelsWide
let origH = bitmap.pixelsHigh
let topCrop = 280  // 顶部裁掉像素数（去 AI 水印）

// 用 CGImage.cropping 直接裁，避免 NSBitmapImageRep.draw 的 srcRect 坐标系混乱
guard let cgImage = bitmap.cgImage else {
    print("❌ CGImage 缺失")
    exit(1)
}
let cropRect = CGRect(x: 0, y: CGFloat(topCrop),
                      width: CGFloat(origW),
                      height: CGFloat(origH - topCrop))
guard let croppedCG = cgImage.cropping(to: cropRect) else {
    print("❌ CGImage cropping 失败")
    exit(1)
}
let cropped = NSBitmapImageRep(cgImage: croppedCG)
let croppedW = cropped.pixelsWide
let croppedH = cropped.pixelsHigh
print("📐 原图: \(origW) × \(origH), 裁后: \(croppedW) × \(croppedH) (顶部去 \(topCrop)px)")

func hexToNSColor(_ hex: String) -> NSColor {
    var clean = hex.uppercased()
    if clean.hasPrefix("#") { clean.removeFirst() }
    guard clean.count == 6, let val = UInt32(clean, radix: 16) else {
        return NSColor(red: 1, green: 0.945, blue: 0.84, alpha: 1)
    }
    let r = CGFloat((val >> 16) & 0xFF) / 255
    let g = CGFloat((val >> 8) & 0xFF) / 255
    let b = CGFloat(val & 0xFF) / 255
    return NSColor(red: r, green: g, blue: b, alpha: 1)
}
let bgColor = hexToNSColor(bgHex)

func makeIcon(size: Int, padRatio: CGFloat = 0.15) -> Data? {
    let contentSide = CGFloat(size) * (1 - padRatio * 2)
    let contentAspect = CGFloat(croppedW) / CGFloat(croppedH)
    let contentW: CGFloat
    let contentH: CGFloat
    if contentAspect >= 1 {
        contentW = contentSide
        contentH = contentSide / contentAspect
    } else {
        contentH = contentSide
        contentW = contentSide * contentAspect
    }
    let contentX = (CGFloat(size) - contentW) / 2
    let contentY = (CGFloat(size) - contentH) / 2
    let dstRect = NSRect(x: contentX, y: contentY, width: contentW, height: contentH)

    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 32
    )!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    bgColor.setFill()
    NSRect(x: 0, y: 0, width: CGFloat(size), height: CGFloat(size)).fill()
    cropped.draw(in: dstRect)
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])
}

let targets: [(path: String, size: Int)] = [
    ("\(outputDir)/icon-1024.png", 1024),
    ("\(outputDir)/icon-512.png", 512),
    ("\(outputDir)/icon-192.png", 192),
    ("\(outputDir)/icon-180.png", 180),
    ("\(outputDir)/mipmap-mdpi/ic_launcher.png", 48),
    ("\(outputDir)/mipmap-hdpi/ic_launcher.png", 72),
    ("\(outputDir)/mipmap-xhdpi/ic_launcher.png", 96),
    ("\(outputDir)/mipmap-xxhdpi/ic_launcher.png", 144),
    ("\(outputDir)/mipmap-xxxhdpi/ic_launcher.png", 192),
]

for target in targets {
    let dir = (target.path as NSString).deletingLastPathComponent
    try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
    guard let data = makeIcon(size: target.size, padRatio: 0.15) else {
        print("❌ 生成 \(target.size) 失败")
        continue
    }
    try data.write(to: URL(fileURLWithPath: target.path))
    print("  ✓ \(target.path) (\(target.size)×\(target.size))")
}

print("✅ 完成。背景 \(bgHex), padding 15%, 去掉顶部 \(topCrop)px 水印")