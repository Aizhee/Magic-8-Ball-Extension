

import * as vscode from 'vscode';

const enum ExtensionPosition {
    explorer = 'explorer',
    panel = 'panel'
}

const DEFAULT_POSITION = ExtensionPosition.panel;

function getConfigurationPosition() {
    return vscode.workspace
        .getConfiguration('vscode-magiceightball')
        .get<ExtensionPosition>('position', DEFAULT_POSITION);
}

function updateExtensionPositionContext() {
    vscode.commands.executeCommand(
        'setContext',
        'vscode-magiceightball.position',
        getConfigurationPosition(),
    );
}

export function activate(context: vscode.ExtensionContext) {
	const webViewProvider = new MagicEightBallProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            MagicEightBallProvider.viewType,
            webViewProvider,
        ),
    );
	
    updateExtensionPositionContext();

	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-magiceightball.start', () => {
			if (getConfigurationPosition() === ExtensionPosition.explorer && webViewProvider) {
                vscode.commands.executeCommand('magicEightBallView.focus');
            } else {
				MagicEightBallPanel.createOrShow(context.extensionUri);
			}
		})
	);
	
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(
            updateExtensionPositionContext,
        ),
    );

	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(MagicEightBallPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				MagicEightBallPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		enableScripts: true,
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'node_modules'), vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

export function deactivate() {}

class MagicEightBallWebViewContainer {
	
    protected _extensionUri: vscode.Uri;

	constructor(
        extensionUri: vscode.Uri
    ) {
        this._extensionUri = extensionUri;
	}

	protected _getHtmlForWebview(webview: vscode.Webview) {
		const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/webview-ui-toolkit', 'dist', 'toolkit.js'));
		const ballImgPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'base_8ball.gif');
		const ballImgSrc = webview.asWebviewUri(ballImgPath);
		const staticBallImgPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'base_8ball_static.png');
		const staticBallSrc = webview.asWebviewUri(staticBallImgPath);
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const nonce = getNonce();

		return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' ${webview.cspSource}; font-src 'self' data: ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${stylesResetUri}" rel="stylesheet">
            <link href="${stylesMainUri}" rel="stylesheet">
            <script type="module" nonce="${nonce}" src="${toolkitUri}"></script>
            <title>Magic 8-Ball</title>

        </head>
        <body>
            <p id="Instructions">Tap the Magic 8-Ball for Answers</p>
			<div id="Eightball_Container">
            		<img draggable="false" id="Eightball" src="${staticBallSrc}" height="100"/>
				<div id="bubble">
				<p id="prediction"></p>
				</div>
            </div>
			
            <script nonce="${nonce}">
                document.getElementById("Eightball").addEventListener("click", function() {
                    this.src = "${ballImgSrc}";
					generatePrediction();
                });

				function generatePrediction() {
					const prediction = getPrediction();
					const textholder = document.getElementById("prediction");
					textholder.textContent = '';
				
					if (textholder.timeout1) clearTimeout(textholder.timeout1);
					if (textholder.timeout2) clearTimeout(textholder.timeout2);
				
					textholder.timeout1 = setTimeout(function() {
						textholder.textContent = prediction;
						textholder.timeout2 = setTimeout(function() {
							textholder.textContent = '';
						}, 4800); 
					}, 3070); 
				}
				
				function getPrediction() {
					const predictions = [
						"Absolutely, but refactor first.",
						"404: Ask again later.",
						"Better not tell you now.",
						"Cannot predict now.",
						"Concentrate and ask again.",
						"Don't count on it X++.",
						"It is certain.",
						"It is decidedly so.",
						"Most likely.",
						"My return is no.",
						"My co-pilot says no.",
						"Outlook not so good.",
						"Outlook good.",
						"Reply hashy.",
						"Signs point to yes",
						"script doubtful.",
						"Write tests first.",
						"Yes, push your changes.",
						"Yes - definitely.",
						"You may rely on it.",
						"IDK how to center a div either.",
						" oh, you know the answer.",
						"what do you think?",
						"Have you tried Google?",
						"Have you tried Stack Overflow?",
						"Have you tried the documentation?",
						"Have you tried the debugger?",
						"Have you tried the logs?",
						"Signs is as clear as 0.1 + 0.2.",
						"Have you tried the console?",
						"Try a different approach.",
						"It's a feature, not a bug.",
						"It works on my machine.",
						"ChatGPT says yes.",
						"ChatGPT says no.",
						"Try touching grass.",
						"Use hashmaps.",
						"Try ALT + F4.",
						"Try a different language.",
						"Try a different framework.",
					];
				const randomIndex = Math.floor(Math.random() * predictions.length);
				return predictions[randomIndex];
				}

            </script>
        </body>
        </html>`;
	}
}

class MagicEightBallPanel extends MagicEightBallWebViewContainer {
	public static currentPanel: MagicEightBallPanel | undefined;
	public static readonly viewType = 'magicEightBallCoding';
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		
		if (MagicEightBallPanel.currentPanel) {
			MagicEightBallPanel.currentPanel._panel.reveal(column);
			return;
		}

		
		const panel = vscode.window.createWebviewPanel(
			MagicEightBallPanel.viewType,
			'Magic 8-Ball',
			column || vscode.ViewColumn.Two,
			getWebviewOptions(extensionUri),
		);

		MagicEightBallPanel.currentPanel = new MagicEightBallPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		MagicEightBallPanel.currentPanel = new MagicEightBallPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		super(extensionUri);
		this._panel = panel;
		this._update();
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case "magiceightball":
						vscode.window.showInformationMessage(message.text);
						return;
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		MagicEightBallPanel.currentPanel = undefined;

		
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}
	
    public getWebview(): vscode.Webview {
        return this._panel.webview;
    }
}


class MagicEightBallProvider extends MagicEightBallWebViewContainer implements vscode.WebviewViewProvider {
	public static readonly viewType = 'magicEightBallView';
	private _view?: vscode.WebviewView;

	constructor(
		private readonly extensionUri: vscode.Uri,
	) { 
		super(extensionUri);
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	public addColor() {
		if (this._view) {
			this._view.show?.(true); 
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}