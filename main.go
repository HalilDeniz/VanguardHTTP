package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"

	"vanguard-http/internal/app"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	application := app.NewApp()

	err := wails.Run(&options.App{
		Title:     "VanguardHTTP",
		Width:     1480,
		Height:    900,
		MinWidth:  1120,
		MinHeight: 700,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 9, G: 13, B: 22, A: 1},
		OnStartup:        application.Startup,
		OnShutdown:       application.Shutdown,
		Bind: []interface{}{
			application,
		},
		Linux: &linux.Options{
			Icon:                icon,
			WindowIsTranslucent: false,
			ProgramName:         "vanguard-http",
		},
	})
	if err != nil {
		log.Fatalf("VanguardHTTP fatal startup error: %v", err)
	}
}