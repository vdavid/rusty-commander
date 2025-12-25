package main

import (
	"flag"
	"fmt"
	"os"
	"time"
)

func main() {
	var (
		rustOnly    = flag.Bool("rust", false, "Run only Rust checks")
		rustOnly2   = flag.Bool("rust-only", false, "Run only Rust checks")
		svelteOnly  = flag.Bool("svelte", false, "Run only Svelte checks")
		svelteOnly2 = flag.Bool("svelte-only", false, "Run only Svelte checks")
		checkName   = flag.String("check", "", "Run a single check by name")
		ciMode      = flag.Bool("ci", false, "Disable auto-fixing (for CI)")
		verbose     = flag.Bool("verbose", false, "Show detailed output")
		help        = flag.Bool("help", false, "Show help message")
		h           = flag.Bool("h", false, "Show help message")
	)
	flag.Parse()

	if *help || *h {
		showUsage()
		os.Exit(0)
	}

	rootDir, err := findRootDir()
	if err != nil {
		printError("Error: %v", err)
		os.Exit(1)
	}

	ctx := &CheckContext{
		CI:      *ciMode,
		Verbose: *verbose,
		RootDir: rootDir,
	}

	// If running a single check
	if *checkName != "" {
		startTime := time.Now()
		check := getCheckByName(*checkName)
		if check == nil {
			printError("Error: Unknown check name: %s", *checkName)
			_, err := fmt.Fprintf(os.Stderr, "Run with --help to see available checks\n")
			if err != nil {
				fmt.Println("Error writing to stderr")
				return
			}
			os.Exit(1)
		}
		err := runCheck(check, ctx)
		totalDuration := time.Since(startTime)
		fmt.Println()
		if err != nil {
			fmt.Printf("%s⏱️  Total runtime: %s%s\n", colorYellow, formatDuration(totalDuration), colorReset)
			os.Exit(1)
		}
		fmt.Printf("%s⏱️  Total runtime: %s%s\n", colorYellow, formatDuration(totalDuration), colorReset)
		os.Exit(0)
	}

	// Determine what to run
	runRust := true
	runSvelte := true
	if *rustOnly || *rustOnly2 {
		runSvelte = false
	}
	if *svelteOnly || *svelteOnly2 {
		runRust = false
	}

	fmt.Println("🔍 Running all checks...")
	fmt.Println()

	startTime := time.Now()
	var failed bool
	var allFailedChecks []string

	if runRust {
		rustFailed, failedChecks := runRustChecks(ctx)
		failed = rustFailed
		allFailedChecks = append(allFailedChecks, failedChecks...)
	}

	if runSvelte {
		svelteFailed, failedChecks := runSvelteChecks(ctx)
		failed = svelteFailed || failed
		allFailedChecks = append(allFailedChecks, failedChecks...)
	}

	totalDuration := time.Since(startTime)
	fmt.Println()
	if failed {
		fmt.Printf("%s⏱️  Total runtime: %s%s\n", colorYellow, formatDuration(totalDuration), colorReset)
		fmt.Printf("%s❌ Some checks failed. Please fix the issues above.%s\n", colorRed, colorReset)
		if len(allFailedChecks) > 0 {
			fmt.Println()
			fmt.Println("To rerun a specific check:")
			for _, checkName := range allFailedChecks {
				fmt.Printf("  go run ./scripts/check --check %s\n", checkName)
			}
		}
		os.Exit(1)
	} else {
		fmt.Printf("%s⏱️  Total runtime: %s%s\n", colorYellow, formatDuration(totalDuration), colorReset)
		fmt.Printf("%s✅ All checks passed!%s\n", colorGreen, colorReset)
		os.Exit(0)
	}
}
