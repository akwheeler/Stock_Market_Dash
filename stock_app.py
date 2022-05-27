from logging import PlaceHolder
from tkinter import Button
from dash import (ALL, MATCH, Dash, Input, Output, State, callback, dash_table,
                  dcc, html)
import dash_bootstrap_components as dbc

from yahoo_fin import stock_info as si
import pandas as pd

df = pd.DataFrame(si.get_stats_valuation("aapl"))

app = Dash(__name__, suppress_callback_exceptions=True)
server = app.server

app.layout = html.Div([
                        dbc.Row([
                            html.H1("Stock App Test")
                        ]),
                        dbc.Row([                            
                                html.Div([
                                dcc.Input(
                                  id = "stock_picker",
                                  type = "text"                                                                    
                                ),
                                html.Button(
                                id = "stock_picker_button",
                                n_clicks = 0,
                                children = 'Submit'
                                ),
                                html.Div(id = "stats_val_table")
                                ])                              
                        ]),
                        dbc.Row([

                        ])
                ])


@app.callback(
    Output("stats_val_table", "children"),    
    [Input("stock_picker_button", "n_clicks")],
    [State("stock_picker", "value")]
)
def earnings_stats(stock_picker_button,stock_picker): 
    
    df = pd.DataFrame(si.get_stats_valuation(stock_picker))
    #columns = [{"name": i, "id": i} for i in df.columns]
    #data = df.to_dict('records')
    
    return dash_table.DataTable(df.to_dict('records'), [{"name": i, "id": i} for i in df.columns])
            



if __name__ == "__main__":
    app.run_server(debug=False)
